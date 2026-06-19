import sys
import os
sys.path.insert(0, ".")

import backend.chatbot

print("--- GREETING ---")
print(backend.chatbot.generate_reply('merhaba', 't1'))

print("\n--- ATTENDANCE ---")
print(backend.chatbot.generate_reply('Arda Güler hangi gün idmana gelmedi', 't1'))

print("\n--- DEBT ---")
print(backend.chatbot.generate_reply('bu ay aidat ödemeyenler kim', 't1'))

print("\n--- MVP ---")
print(backend.chatbot.generate_reply('en değerli oyuncum kim', 't1'))

print("\n--- COMPOUND PLAN EDIT ---")
print(backend.chatbot.generate_reply('26 haziran saat sabah 10 için antrenman ekle şut antrenmanı olmalı. 25 haziran perşembe günü olan antrenmanı da kaldır gerekçe olarak hastane randevusu yaz', 't1'))
