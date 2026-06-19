import sys
sys.path.insert(0, ".")
import importlib.util
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(os.path.dirname(current_dir), "backend", "chatbot", "model.py")
spec = importlib.util.spec_from_file_location("chatbot_model", model_path)
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)

clean_input = model.clean_input
extract_time_from_query = model.extract_time_from_query

add_query = "26 haziran saat sabah 10 için antrenman ekle şut antrenmanı olmalı"
parsed_time = extract_time_from_query(clean_input(add_query))
print("PARSED TIME:", parsed_time)
