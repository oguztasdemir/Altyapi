from backend.chatbot import model

def generate_reply(message, team_id):
    return model.predict_response(message, team_id)
