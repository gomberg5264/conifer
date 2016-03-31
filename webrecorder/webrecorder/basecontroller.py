from bottle import request, HTTPError, redirect as bottle_redirect
from functools import wraps


# ============================================================================
class BaseController(object):
    def __init__(self, app, jinja_env, manager, config):
        self.app = app
        self.jinja_env = jinja_env
        self.manager = manager
        self.config = config

        self.init_routes()

    def init_routes(self):
        raise NotImplemented()

    def get_user_coll(self):
        user = request.query.get('user')
        coll = request.query.get('coll')
        if not user or not coll:
            self._raise_error(400, 'MissingUserColl',
                              'User and Collection must be specified')

        if user == '@anon':
            session = self.get_session()
            if not session.is_anon():
                session.set_anon()
            user = session.anon_user
            coll = 'anonymous'

        # for now, while only anon implemented
        else:
            self._raise_error(404, 'InvalidUserColl', 'No Such User or Collection')

        return user, coll

    def _raise_error(self, code, status_type, message):
        result = {'status': status_type, 'message': message}
        raise HTTPError(code, message, exception=result)

    def get_session(self):
        return request.environ['webrec.session']

    def flash_message(self, *args, **kwargs):
        return self.get_session().flash_message(*args, **kwargs)

    def get_user_home(self, user):
        return '/' + user

    def get_redir_back(skip, default='/'):
        redir_to = request.headers.get('Referer', default)
        if redir_to.endswith(skip):
            redir_to = default
        return redir_to

    def post_get(self, name, default=''):
        res = request.POST.get(name, default).strip()
        if not res:
            res = default
        return res

    def get_host(self):
        return request.urlparts.scheme + '://' + request.urlparts.netloc

    def redirect(self, url):
        if url.startswith('/'):
            url = self.get_host() + url

        return bottle_redirect(url)

    def jinja2_view(self, template_name):
        def decorator(view_func):
            @wraps(view_func)
            def wrapper(*args, **kwargs):
                resp = view_func(*args, **kwargs)

                if isinstance(resp, dict):
                    ctx_params = request.environ.get('webrec.template_params')
                    if ctx_params:
                        resp.update(ctx_params)

                    template = self.jinja_env.jinja_env.get_or_select_template(template_name)
                    return template.render(**resp)
                else:
                    return resp

            return wrapper

        return decorator


