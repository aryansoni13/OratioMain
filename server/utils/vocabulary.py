import os
import json
import google.generativeai as genai

# Configure Gemini API
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

def evaluate_vocabulary(transcription, context, linguistic_analysis=None):
    """
    Evaluate vocabulary with detailed linguistic insights
    
    Args:
        transcription: The speech transcription
        context: The context/purpose of the speech
        linguistic_analysis: Optional detailed linguistic analysis data
        
    Returns:
        Detailed vocabulary evaluation report
    """
    # Initialize the Gemini model
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Prepare linguistic insights if available
    linguistic_insights = ""
    if linguistic_analysis:
        vocab = linguistic_analysis.get('vocabulary', {})
        fillers = linguistic_analysis.get('filler_words', {})
        hedges = linguistic_analysis.get('hedge_words', {})
        power = linguistic_analysis.get('power_words', {})
        weak = linguistic_analysis.get('weak_words', {})
        transitions = linguistic_analysis.get('transitions', {})
        pos = linguistic_analysis.get('pos_distribution', {})
        entities = linguistic_analysis.get('named_entities', {})
        
        # Format most common words compactly
        most_common = vocab.get('most_common_words', [])[:5]
        common_words_str = ', '.join([f"{word}({count})" for word, count in most_common]) if most_common else "N/A"
        
        # Format top fillers compactly
        top_fillers = fillers.get('top_3', [])[:3]
        fillers_str = ', '.join([f"{word}({count})" for word, count in top_fillers]) if top_fillers else "N/A"
        
        # Format transition categories compactly (just counts)
        trans_cats = transitions.get('by_category', {})
        trans_str = ', '.join([f"{k}:{v}" for k, v in list(trans_cats.items())[:3]]) if trans_cats else "N/A"
        
        # Format entity types compactly (just counts)
        entity_types = entities.get('entity_types', {})
        entities_str = ', '.join([f"{k}:{v}" for k, v in entity_types.items()]) if entity_types else "N/A"
        
        linguistic_insights = f"""
        
Linguistic Metrics:
Vocabulary: {vocab.get('total_words', 0)} words, {vocab.get('unique_words', 0)} unique, diversity {vocab.get('lexical_diversity', 0):.2f}
Top words: {common_words_str}
Fillers: {fillers.get('total_count', 0)} ({fillers.get('percentage', 0):.1f}%) - {fillers_str}
Confidence: {power.get('total_count', 0)} power, {hedges.get('total_count', 0)} hedge, {weak.get('total_count', 0)} weak
Transitions: {transitions.get('total_count', 0)} total ({trans_str})
POS: {pos.get('details', {}).get('nouns', 0)}N, {pos.get('details', {}).get('verbs', 0)}V, {pos.get('details', {}).get('adjectives', 0)}Adj
Entities: {entities.get('total_entities', 0)} ({entities_str})
        """
    
    prompt = f"""
    Context: {context}
    Script: {transcription}
    {linguistic_insights}
    
    Based on the speech and detailed linguistic analysis, provide a comprehensive vocabulary evaluation report.
    
    Structure your report as follows:
    
    1. OVERVIEW (2-3 sentences)
       - Overall vocabulary quality and appropriateness for the context
    
    2. STRENGTHS (3-4 bullet points)
       - What the speaker does well with vocabulary
       - Specific examples from the speech
    
    3. AREAS FOR IMPROVEMENT (3-4 bullet points)
       - Specific vocabulary weaknesses
       - Examples of filler words, repetition, or weak language
       - Concrete suggestions for improvement
    
    4. SPECIFIC RECOMMENDATIONS (3-5 actionable items)
       - Replace specific weak words with stronger alternatives
       - Reduce specific filler words
       - Add more varied vocabulary in specific areas
    
    Make the feedback specific, actionable, and encouraging. Reference actual words and phrases from the speech.
    Do not include any numeric scores.
    """
    
    import re
    from utils.gemini_rate_limiter import gemini_generate_with_retry
    
    try:
        response = gemini_generate_with_retry(model, prompt)
        evaluation = response.text
        print("Vocabulary evaluation complete.")
        return evaluation
    except Exception as e:
        print(f"Error generating vocabulary evaluation: {str(e)}")
        return "Unable to evaluate vocabulary at this time."


def generate_vocabulary_insights_json(linguistic_analysis):
    """
    Generate structured JSON insights from linguistic analysis
    
    Args:
        linguistic_analysis: The linguistic analysis data
        
    Returns:
        Dictionary with structured insights
    """
    if not linguistic_analysis:
        return {}
    
    vocab = linguistic_analysis.get('vocabulary', {})
    fillers = linguistic_analysis.get('filler_words', {})
    hedges = linguistic_analysis.get('hedge_words', {})
    power = linguistic_analysis.get('power_words', {})
    
    # Calculate confidence ratio
    hedge_count = hedges.get('total_count', 0)
    power_count = power.get('total_count', 0)
    
    if hedge_count + power_count > 0:
        confidence_ratio = power_count / (hedge_count + power_count)
    else:
        confidence_ratio = 0.5
    
    return {
        'lexical_diversity': vocab.get('lexical_diversity', 0),
        'filler_percentage': fillers.get('percentage', 0),
        'confidence_ratio': round(confidence_ratio, 2),
        'total_words': vocab.get('total_words', 0),
        'unique_words': vocab.get('unique_words', 0),
        'top_fillers': [f[0] for f in fillers.get('top_3', [])],
        'power_word_count': power_count,
        'hedge_word_count': hedge_count
    }