import home from './home';
import login from './login';
import user from './user';

const page: App.I18n.Schema['page'] = {
  user,
  login,
  home
};

export default page;
