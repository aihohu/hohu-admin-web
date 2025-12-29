const login: App.I18n.Schema['page']['login'] = {
  common: {
    loginOrRegister: 'Login / Register',
    userNamePlaceholder: 'Please enter user name',
    phonePlaceholder: 'Please enter phone number',
    codePlaceholder: 'Please enter verification code',
    passwordPlaceholder: 'Please enter password',
    confirmPasswordPlaceholder: 'Please enter password again',
    codeLogin: 'Verification code login',
    confirm: 'Confirm',
    back: 'Back',
    validateSuccess: 'Verification passed',
    loginSuccess: 'Login successfully',
    welcomeBack: 'Welcome back, {userName} !'
  },
  pwdLogin: {
    title: 'Password Login',
    rememberMe: 'Remember me',
    forgetPassword: 'Forget password?',
    register: 'Register',
    otherAccountLogin: 'Other Account Login',
    otherLoginMode: 'Other Login Mode',
    superAdmin: 'Super Admin',
    admin: 'Admin',
    user: 'User'
  },
  codeLogin: {
    title: 'Verification Code Login',
    getCode: 'Get verification code',
    reGetCode: 'Reacquire after {time}s',
    sendCodeSuccess: 'Verification code sent successfully',
    imageCodePlaceholder: 'Please enter image verification code'
  },
  register: {
    title: 'Register',
    agreement: 'I have read and agree to',
    protocol: '《User Agreement》',
    policy: '《Privacy Policy》'
  },
  resetPwd: {
    title: 'Reset Password'
  },
  bindWeChat: {
    title: 'Bind WeChat'
  }
};
export default login;
