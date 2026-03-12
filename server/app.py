from flask import Flask, request, jsonify, send_from_directory
import pymongo
import re  
from routes.auth_routes import auth_bp
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import pandas as pd
from bson import ObjectId
import json
import time
from datetime import datetime, timedelta, timezone
import google.generativeai as genai

# Heavy ML utilities are imported lazily inside /upload to keep startup fast.
# The model_manager handles background pre-loading.
from model_manager import model_manager
from utils.gemini_rate_limiter import gemini_generate_with_retry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
load_dotenv()

# Database and Services Setup
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    raise ValueError("MONGODB_URI not set in environment variables")
client = pymongo.MongoClient(MONGO_URI)
db = client["Eloquence"]
collections_user = db["user"]
reports_collection = db["reports"]
overall_reports_collection = db["overall_reports"]

# Gemini client setup
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

# Application Configuration
UPLOAD_FOLDER = 'Uploads'
ALLOWED_EXTENSIONS = {'mp4', 'wav', 'mp3', 'm4a', 'webm'}  
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_keys_to_strings(data):
    """
    Recursively converts all numeric keys in a dictionary to strings.
    """
    if isinstance(data, dict):
        return {str(k): convert_keys_to_strings(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_strings(item) for item in data]
    else:
        return data

def convert_objectid_to_string(data):
    """
    Recursively converts all ObjectId fields in a dictionary to strings.
    """
    if isinstance(data, dict):
        return {k: convert_objectid_to_string(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_objectid_to_string(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data

# Register auth routes
app.register_blueprint(auth_bp)

@app.route('/')
def home():
    return "Hello World"

@app.route('/health')
def health():
    """Check which ML models are loaded and ready.
    Models load on-demand when /upload is called — not at startup."""
    return jsonify({
        "status": "ok",
        "mode": "on-demand",
        "whisper_ready": model_manager.is_whisper_ready(),
        "ser_ready": model_manager.is_ser_ready(),
        "spacy_ready": model_manager.is_spacy_ready(),
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    
    context = request.form.get('context', '')
    title = request.form.get('title', 'Untitled Session')
    user_id = request.form.get('userId')

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "No selected or allowed file"}), 400

    raw_filename = secure_filename(file.filename)
    # Prefix with timestamp to avoid collisions
    filename = f"{int(time.time())}_{raw_filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    try:
        # Lazy-import heavy ML utilities only when actually needed
        from utils.audioextraction import extract_audio_to_memory
        from utils.expressions import analyze_video_emotions
        from utils.transcription import speech_to_text_long
        from utils.vocals import predict_emotion
        from utils.vocabulary import evaluate_vocabulary
        from utils.linguistic_analysis import analyze_transcript_complete, generate_linguistic_summary

        ext = file.filename.rsplit('.', 1)[1].lower()
        # Determine mode: check form field first, then fall back to extension
        form_mode = request.form.get('mode', '')
        if form_mode in ('video', 'audio'):
            mode = form_mode
        elif ext == 'mp4' or (ext == 'webm' and form_mode != 'audio'):
            mode = 'video'
        else:
            mode = 'audio'

        # In-memory audio processing
        if mode == "video":
            audio_data = extract_audio_to_memory(file_path)
            if audio_data is None:
                return jsonify({"error": "Failed to extract audio from video"}), 500
            facial_emotion_analysis = analyze_video_emotions(file_path)
        else:  # Audio mode
            audio_data = file_path  # Pass the audio file path directly
            facial_emotion_analysis = pd.DataFrame()

        # Run analysis with updated utility functions
        transcription = speech_to_text_long(audio_data)
        vocal_emotion_analysis = predict_emotion(audio_data)
        
        # Run detailed linguistic analysis
        print("Running linguistic analysis...")
        linguistic_analysis = analyze_transcript_complete(transcription, vocal_emotion_analysis)
        linguistic_summary = generate_linguistic_summary(linguistic_analysis)
        
        # Generate vocabulary report with linguistic insights
        vocabulary_report = evaluate_vocabulary(transcription, context, linguistic_analysis)
        
        # Convert DataFrame to string for LLM processing
        emotion_analysis_str = facial_emotion_analysis.to_string(index=False) if not facial_emotion_analysis.empty else "No facial data"

        # Generate reports (rate limiter enforces proper spacing between Gemini calls)
        print("Generating scores...")
        scores = generate_scores(transcription, vocal_emotion_analysis, emotion_analysis_str, linguistic_analysis)
        
        print("Generating speech report...")
        speech_report = generate_speech_report(transcription, context, vocal_emotion_analysis, linguistic_analysis)
        
        print("Generating expression report...")
        expression_report = generate_expression_report(emotion_analysis_str) if mode == "video" else "No expression analysis for audio-only mode."

        # Prepare and save report
        from datetime import datetime
        report_data = {
            "userId": user_id,
            "title": title,
            "context": context,
            "transcription": transcription,
            "vocabulary_report": vocabulary_report,
            "speech_report": speech_report,
            "expression_report": expression_report,
            "scores": scores,
            "linguistic_analysis": linguistic_analysis,
            "linguistic_summary": linguistic_summary,
            "vocal_emotions": vocal_emotion_analysis,
            "uploaded_filename": filename,
            "createdAt": datetime.utcnow()
        }
        result = reports_collection.insert_one(report_data.copy())
        report_data["_id"] = str(result.inserted_id)
        update_overall_reports(user_id)
        report_data = convert_objectid_to_string(report_data)

        # After first upload, pre-warm remaining ML models in background
        # so subsequent uploads are faster
        model_manager.prewarm_remaining()

        return jsonify(report_data), 200

    except Exception as e:
        print(f"An error occurred during processing: {e}")
        # Cleanup on failure only
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({"error": "An internal server error occurred during analysis"}), 500

def update_overall_reports(user_id):
    """
    Recalculate and update the overall reports and scores for a user.
    """
    user_reports = list(reports_collection.find({"userId": user_id, "deletedAt": {"$exists": False}}))

    if not user_reports:
        return

    total_vocabulary = 0
    total_voice = 0
    total_expressions = 0
    for report in user_reports:
        total_vocabulary += report["scores"]["vocabulary"]
        total_voice += report["scores"]["voice"]
        total_expressions += report["scores"]["expressions"]

    avg_vocabulary = total_vocabulary / len(user_reports)
    avg_voice = total_voice / len(user_reports)
    avg_expressions = total_expressions / len(user_reports)

    overall_reports = generate_overall_reports(user_reports)

    overall_report_data = {
        "userId": user_id,
        "avg_vocabulary": avg_vocabulary,
        "avg_voice": avg_voice,
        "avg_expressions": avg_expressions,
        "overall_reports": overall_reports
    }

    overall_reports_collection.update_one(
        {"userId": user_id},
        {"$set": overall_report_data},
        upsert=True
    )

@app.route('/user-reports-list', methods=['GET'])
def get_user_reports_list():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    user_reports = list(reports_collection.find({"userId": user_id, "deletedAt": {"$exists": False}}))
    user_reports = convert_objectid_to_string(user_reports)

    return jsonify(user_reports), 200

@app.route('/user-reports', methods=['GET'])
def get_user_reports():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    overall_report = overall_reports_collection.find_one({"userId": user_id})

    if not overall_report:
        return jsonify({"error": "No overall report found for the user"}), 404

    overall_report = convert_objectid_to_string(overall_report)

    return jsonify(overall_report), 200


@app.route('/chat', methods=['POST'])
def chat_with_report():
    """
    Conversational endpoint for asking questions about a specific report
    """
    data = request.json
    report_id = data.get('reportId')
    user_message = data.get('message')
    chat_history = data.get('history', [])
    
    if not report_id or not user_message:
        return jsonify({"error": "Report ID and message are required"}), 400
    
    # Fetch the report
    try:
        report = reports_collection.find_one({"_id": ObjectId(report_id)})
    except:
        return jsonify({"error": "Invalid report ID"}), 400
    
    if not report:
        return jsonify({"error": "Report not found"}), 404
    
    # Build context with report data
    linguistic_summary = report.get('linguistic_summary', {})
    linguistic_analysis = report.get('linguistic_analysis', {})
    
    # Format chat history
    history_text = ""
    if chat_history:
        for msg in chat_history[-5:]:  # Last 5 messages for context
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            history_text += f"{role.capitalize()}: {content}\n"
    
    # Use only first 1000 words of transcription for context (still plenty for examples)
    transcription = report.get('transcription', '')
    words = transcription.split()
    transcription_sample = ' '.join(words[:1000]) if len(words) > 1000 else transcription
    
    context = f"""
You are an expert public speaking coach. Answer the user's question about their speech.

SPEECH: {report.get('title', 'Untitled')} - {report.get('context', 'General')}

SCORES: Vocabulary {report.get('scores', {}).get('vocabulary', 0)}/100, Voice {report.get('scores', {}).get('voice', 0)}/100, Expressions {report.get('scores', {}).get('expressions', 0)}/100

KEY INSIGHTS:
{json.dumps(linguistic_summary, indent=2)}

TRANSCRIPTION SAMPLE (first 1000 words):
{transcription_sample}

RECENT CHAT:
{history_text}

USER: {user_message}

Provide a helpful, specific answer. Quote from the transcription when relevant. Be conversational and encouraging.
    """
    
    try:
        response = gemini_generate_with_retry(gemini_model, context)
        
        return jsonify({
            "response": response.text,
            "reportId": report_id
        }), 200
    except Exception as e:
        print(f"Error in chat: {e}")
        return jsonify({"error": "Failed to generate response"}), 500


@app.route('/report/<report_id>', methods=['GET'])
def get_single_report(report_id):
    """
    Get a single report by ID with all details
    """
    try:
        report = reports_collection.find_one({"_id": ObjectId(report_id)})
    except:
        return jsonify({"error": "Invalid report ID"}), 400
    
    if not report:
        return jsonify({"error": "Report not found"}), 404
    
    report = convert_objectid_to_string(report)
    return jsonify(report), 200


# ─── Trash / Recycle Bin Endpoints ───

@app.route('/report/<report_id>/trash', methods=['POST'])
def trash_report(report_id):
    """Soft-delete a report by setting deletedAt timestamp."""
    try:
        oid = ObjectId(report_id)
    except:
        return jsonify({"error": "Invalid report ID"}), 400

    result = reports_collection.update_one(
        {"_id": oid, "deletedAt": {"$exists": False}},
        {"$set": {"deletedAt": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        return jsonify({"error": "Report not found or already trashed"}), 404

    # Recalculate overall reports excluding trashed
    report = reports_collection.find_one({"_id": oid})
    if report:
        update_overall_reports(report["userId"])

    return jsonify({"message": "Report moved to trash"}), 200


@app.route('/report/<report_id>/restore', methods=['POST'])
def restore_report(report_id):
    """Restore a soft-deleted report."""
    try:
        oid = ObjectId(report_id)
    except:
        return jsonify({"error": "Invalid report ID"}), 400

    result = reports_collection.update_one(
        {"_id": oid, "deletedAt": {"$exists": True}},
        {"$unset": {"deletedAt": ""}}
    )
    if result.modified_count == 0:
        return jsonify({"error": "Report not found or not in trash"}), 404

    report = reports_collection.find_one({"_id": oid})
    if report:
        update_overall_reports(report["userId"])

    return jsonify({"message": "Report restored"}), 200


@app.route('/report/<report_id>', methods=['DELETE'])
def permanent_delete_report(report_id):
    """Permanently delete a trashed report."""
    try:
        oid = ObjectId(report_id)
    except:
        return jsonify({"error": "Invalid report ID"}), 400

    report = reports_collection.find_one({"_id": oid})
    if not report or "deletedAt" not in report:
        return jsonify({"error": "Report not found in trash"}), 404

    user_id = report["userId"]
    # Delete the associated uploaded file if it exists
    uploaded_file = report.get("uploaded_filename")
    if uploaded_file:
        fpath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file)
        if os.path.exists(fpath):
            os.remove(fpath)
    reports_collection.delete_one({"_id": oid})
    update_overall_reports(user_id)

    return jsonify({"message": "Report permanently deleted"}), 200


@app.route('/report/<report_id>/download', methods=['GET'])
def download_report_file(report_id):
    """Download the uploaded file associated with a report."""
    try:
        oid = ObjectId(report_id)
    except:
        return jsonify({"error": "Invalid report ID"}), 400

    report = reports_collection.find_one({"_id": oid})
    if not report:
        return jsonify({"error": "Report not found"}), 404

    filename = report.get("uploaded_filename")
    if not filename:
        return jsonify({"error": "No file available for this report"}), 404

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found on server"}), 404

    return send_from_directory(
        app.config['UPLOAD_FOLDER'],
        filename,
        as_attachment=True,
        download_name=report.get("title", "recording") + os.path.splitext(filename)[1]
    )


@app.route('/trash', methods=['GET'])
def get_trash():
    """Get all trashed reports for a user."""
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    # Auto-cleanup: permanently delete reports trashed more than 30 days ago
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    reports_collection.delete_many({
        "userId": user_id,
        "deletedAt": {"$exists": True, "$lt": cutoff}
    })

    trashed = list(reports_collection.find({"userId": user_id, "deletedAt": {"$exists": True}}))
    trashed = convert_objectid_to_string(trashed)
    return jsonify(trashed), 200


def generate_overall_reports(user_reports):
    """
    Generate three separate overall reports for Voice, Expressions, and Vocabulary.
    Uses compact summaries to avoid token limits.
    """
    user_reports = convert_objectid_to_string(user_reports)
    
    # Create compact summary of reports (only key data, not full linguistic analysis)
    compact_reports = []
    for report in user_reports:
        compact_reports.append({
            "title": report.get('title', 'Untitled'),
            "context": report.get('context', ''),
            "scores": report.get('scores', {}),
            "linguistic_summary": report.get('linguistic_summary', {})  # Just the summary, not full analysis
        })

    voice_system_message = """
    You are an expert in speech analysis. Based on the provided report summaries, generate an overall report summarizing the user's performance in terms of Voice (emotional tone, clarity, and expressiveness).
    """
    voice_user_message = f"""
    Report Summaries: {json.dumps(compact_reports, indent=2)}
    Provide a short one paragraph report summarizing the user's overall performance in Voice. Focus on:
    - Emotional tone: Does the tone match the context and intended message?
    - Clarity: Is the speech clear and easy to understand?
    - Expressiveness: Does the speaker effectively convey emotions through their voice?
    - Do not include any scores in the report.
    """
    voice_response = gemini_generate_with_retry(gemini_model, [voice_system_message, voice_user_message])
    voice_report = voice_response.text

    expressions_system_message = """
    You are an expert in facial expression analysis. Based on the provided report summaries, generate an overall report summarizing the user's performance in terms of Facial Expressions (emotional appropriateness and expressiveness).
    """
    expressions_user_message = f"""
    Report Summaries: {json.dumps(compact_reports, indent=2)}
    Provide a short one paragraph report summarizing the user's overall performance in Facial Expressions. Focus on:
    - Emotional appropriateness: Do the facial expressions match the context and intended message?
    - Expressiveness: Are the facial expressions dynamic and engaging?
    - Consistency: Are the facial expressions consistent with the tone of the speech?
    - Do not include any scores in the report.
    """
    expressions_response = gemini_generate_with_retry(gemini_model, [expressions_system_message, expressions_user_message])
    expressions_report = expressions_response.text

    vocabulary_system_message = """
    You are an expert in language and vocabulary analysis. Based on the provided report summaries, generate an overall report summarizing the user's performance in terms of Vocabulary (richness, relevance, and clarity of words).
    """
    vocabulary_user_message = f"""
    Report Summaries: {json.dumps(compact_reports, indent=2)}
    Provide a short one paragraph report summarizing the user's overall performance in Vocabulary. Focus on:
    - Richness: Does the user use a varied and engaging vocabulary?
    - Relevance: Are the words used appropriate for the context?
    - Clarity: Are the words clear and easy to understand?
    - Do not include any scores in the report.
    """
    vocabulary_response = gemini_generate_with_retry(gemini_model, [vocabulary_system_message, vocabulary_user_message])
    vocabulary_report = vocabulary_response.text

    return {
        "voice_report": voice_report,
        "expressions_report": expressions_report,
        "vocabulary_report": vocabulary_report,
    }



def generate_scores(transcription, audio_emotion, emotion_analysis, linguistic_data=None):
    """
    Generate scores for Vocabulary, Voice, and Expressions using the LLM with linguistic insights.
    """
    # Prepare COMPACT linguistic insights summary (only key metrics)
    linguistic_summary = ""
    if linguistic_data:
        vocab = linguistic_data.get('vocabulary', {})
        fillers = linguistic_data.get('filler_words', {})
        hedges = linguistic_data.get('hedge_words', {})
        power = linguistic_data.get('power_words', {})
        
        linguistic_summary = f"""
Linguistic Metrics:
- Lexical Diversity: {vocab.get('lexical_diversity', 0):.2f}, Words: {vocab.get('total_words', 0)}/{vocab.get('unique_words', 0)}
- Fillers: {fillers.get('percentage', 0):.1f}%, Hedges: {hedges.get('total_count', 0)}, Power: {power.get('total_count', 0)}
        """
    
    system_message = """
    You are an expert in speech analysis. Based on the provided transcription, audio emotion data, 
    facial emotion analysis, and linguistic metrics, generate scores (out of 100) for the following categories:

    - Vocabulary: Measures the richness and relevance of words.
      - 90-100: Highly varied, sophisticated vocabulary perfectly suited to context; no repetition or clichés.
      - 70-89: Good variety and relevance; minor repetition or simplicity.
      - 50-69: Basic vocabulary; some irrelevance or overuse of simple terms.
      - 30-49: Limited variety; frequent repetition or inappropriate words.
      - 0-29: Poor, repetitive, or irrelevant vocabulary.
      Consider: lexical diversity, filler word usage, and word choice appropriateness.

    - Voice: Assesses the expressiveness and emotional impact of vocal tone.
      - 90-100: Excellent expressiveness; emotions perfectly match context (e.g., enthusiastic for motivational speech).
      - 70-89: Good match and clarity; minor mismatches in tone.
      - 50-69: Average expressiveness; some unclear or mismatched emotions.
      - 30-49: Limited emotional range; frequent mismatches.
      - 0-29: Monotone or completely mismatched emotions.
      Consider: emotional variety, confidence markers, and tone consistency.

    - Expressions: Evaluates the appropriateness of facial expressions.
      - 90-100: Dynamic, engaging expressions fully aligned with speech tone and context.
      - 70-89: Mostly appropriate and consistent; minor inconsistencies.
      - 50-69: Average dynamism; some mismatches with tone.
      - 30-49: Limited expressiveness; frequent inconsistencies.
      - 0-29: Inappropriate or flat expressions.

    Provide only the three scores in JSON format, like:
    {"vocabulary": 85, "voice": 78, "expressions": 90}
    """

    user_message = f"""
    Transcription: {transcription}

    Audio Emotion Data: {audio_emotion}

    Facial Emotion Analysis: {emotion_analysis}
    
    {linguistic_summary}

    Provide only the JSON output with numeric scores based on the criteria.
    """

    try:
        response = gemini_generate_with_retry(
            gemini_model,
            [system_message, user_message],
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.0
            )
        )
        
        # Strip any potential markdown/code blocks (e.g., ```json
        cleaned_text = re.sub(r'```(?:json)?\s*|\s*```', '', response.text).strip()
        
        scores = json.loads(cleaned_text)
        
        # Validate scores are integers 0-100; default to 0 if invalid
        for key in ['vocabulary', 'voice', 'expressions']:
            if not isinstance(scores.get(key), int) or not 0 <= scores[key] <= 100:
                scores[key] = 0
        
        return scores
    except Exception as e:
        print(f"Error generating scores: {e}")
        return {"vocabulary": 0, "voice": 0, "expressions": 0}

def generate_speech_report(transcription, context, audio_emotion, linguistic_data=None):
    """
    Generate speech report with linguistic insights
    """
    linguistic_context = ""
    if linguistic_data:
        hedges = linguistic_data.get('hedge_words', {})
        power = linguistic_data.get('power_words', {})
        confident = linguistic_data.get('confident_phrases', {})
        
        linguistic_context = f"""
        
        Additional Linguistic Insights:
        - Hedge words (uncertainty markers): {hedges.get('total_count', 0)}
        - Power words (confident language): {power.get('total_count', 0)}
        - Confident phrases: {confident.get('total_count', 0)}
        """
    
    system_message = f"""
    You are an expert in emotional and contextual analysis of speeches. Based on the context: "{context}", 
    evaluate if the emotions expressed in the audio match the intended purpose. Consider the following emotion data:
    {audio_emotion}.
    {linguistic_context}
    """
    user_message = """
    Provide a detailed 2-3 paragraph report on the emotional appropriateness and delivery of the speech. Focus on:
    - Emotional tone: Does the tone match the context and intended message?
    - Clarity: Is the speech clear and easy to understand?
    - Expressiveness: Does the speaker effectively convey emotions through their voice?
    - Confidence: Does the language show certainty or hesitation?
    - Provide specific examples and actionable feedback.
    - Do not include any scores in the report.
    """
    try:
        response = gemini_generate_with_retry(gemini_model, [system_message, user_message])
        return response.text
    except Exception as e:
        print(f"Error generating speech report: {e}")
        return "Unable to generate speech report due to API limitations."

def generate_expression_report(emotion_analysis_str):
    """
    Generate a report based on the emotion analysis data with retry logic.
    """
    system_message = f"""
    You are an expert in emotional analysis of facial expressions. Evaluate the following emotion data:
    {emotion_analysis_str}.
    """
    user_message = """
    Provide a short one paragraph report on the emotional appropriateness of the facial expressions. Focus on:
    - Emotional appropriateness: Do the facial expressions match the context and intended message?
    - Expressiveness: Are the facial expressions dynamic and engaging?
    - Consistency: Are the facial expressions consistent with the tone of the speech?
    - Do not include any scores in the report.
    """
    
    try:
        response = gemini_generate_with_retry(gemini_model, [system_message, user_message])
        return response.text
    except Exception as e:
        print(f"Error generating expression report: {e}")
        return "Unable to generate expression report due to API limitations."

if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        model_manager.start_background_loading()
    app.run(debug=True, threaded=True, use_reloader=False)