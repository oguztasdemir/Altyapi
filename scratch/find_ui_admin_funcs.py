with open(r"c:\Users\User\Desktop\Altyapı Manager\frontend\static\js\modules\ui.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
funcs = [
    "handleAdminSetupSubmit", 
    "handleAdminLoginSubmit", "handleAdminPasswordChange", 
    "handleAdminSaveSettings", "handleAdminSendEmailOTP", 
    "handleAdminVerifyEmailOTP", "openForgotPasswordModal", 
    "handleForgotSendOTP", "handleForgotVerifySubmit"
]

for fn in funcs:
    matches = re.findall(f"\\b{fn}\\b", content)
    print(f"Function {fn}: count = {len(matches)}")
