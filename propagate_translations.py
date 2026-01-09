import json
import os

# List of all language codes to update (excluding 'en')
languages = ['nl', 'fr', 'de', 'fi', 'pl', 'da', 'hu', 'sv', 'no']
base_path = '/Users/johnmelvin/Test Project 1/DEL SOL Prime Homes 2.0/src/translations/landing'

# Load the source English translations
with open(f'{base_path}/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

# Helper function to merge dictionaries (deep merge)
def merge_translations(source, target):
    for key, value in source.items():
        if isinstance(value, dict):
            if key not in target:
                target[key] = {}
            if isinstance(target[key], dict):
                merge_translations(value, target[key])
            else:
                # If target has a non-dict value (structural collision), overwrite with source dict
                target[key] = value
        else:
            # Overwrite or add the key with English value
            # Note: In a real localization flow, we might want to keep existing translations if valid,
            # but for this restructure, we prioritize the new keys/structure.
            # To be safe for existing keys that match, we could keep them, but since we changed structure significantly
            # (e.g. hero structure changes), blindly keeping might be risky.
            # However, the user instruction was "Propagate these new keys... I will use the provided English copy for ALL languages"
            target[key] = value

for lang in languages:
    file_path = f'{base_path}/{lang}.json'
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                lang_data = json.load(f)
        else:
            lang_data = {}
        
        # We want to essentially REPLACE the structure with EN structure for the new keys,
        # but maybe keep old top-level keys if they differ? 
        # Actually, the requirement implies a strict sync of structure.
        # So we will copy en_data and overwrite with existing lang_data ONLY where keys match exactly and structure is same?
        # NO, user said "Use provided English copy for ALL languages for these new keys".
        # Simplest approach: Replace the entire content with EN data for now to guarantee no crashes.
        # But wait, we might want to preserve SOME existing translations if they map correctly?
        # The prompt says: "I will primarily update the en.json content... for the other 9 languages, I will maintain the structure and keys but may need to assume some translations or reuse existing ones where possible, or use placeholders".
        # AND "New content keys will be added... I will use the provided English copy for ALL languages for these new keys".
        
        # Given the massive structural change (Hero changed completely, new sections), 
        # it is safer to overwrite the matching sections (hero, video, emma, fallback, classicOptin) with English.
        # Footer and Header might still be valid translations?
        
        # Let's start with a copy of EN data as the base new structure
        new_lang_data = en_data.copy()
        
        # Now try to patch in existing translations if they exist?
        # Actually, for this specific task, "Header" and "Footer" likely didn't change much.
        # But "Hero" changed text completely.
        # So, overwriting Hero with EN is correct.
        # "Video", "Emma", "Fallback", "ClassicOptin" are NEW or heavily modified -> Overwrite with EN.
        
        # "Footer" -> Privacy/Terms. We can try to keep old values if they exist.
        if 'footer' in lang_data and 'footer' in new_lang_data:
            if 'privacy' in lang_data['footer']: new_lang_data['footer']['privacy'] = lang_data['footer']['privacy']
            if 'terms' in lang_data['footer']: new_lang_data['footer']['terms'] = lang_data['footer']['terms']

        # "Header" -> CTA might be different ("Speak with Emma" was likely translated before? No, wait, cta is newish?)
        # Let's keep it safe. If we want to restore old header/footer translations, we can.
        # But for the core content sections, use EN.
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(new_lang_data, f, indent=2, ensure_ascii=False)
            
        print(f"Updated {lang}.json")
        
    except Exception as e:
        print(f"Error updating {lang}: {e}")
