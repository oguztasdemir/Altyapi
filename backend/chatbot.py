_cached_model = None

def generate_reply(message, team_id, confirm_action=None, day=None):
    global _cached_model
    if _cached_model is None:
        import importlib.util
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "chatbot", "model.py")
        spec = importlib.util.spec_from_file_location("chatbot_model", model_path)
        _cached_model = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_cached_model)
    return _cached_model.predict_response(message, team_id, confirm_action=confirm_action, day=day)


