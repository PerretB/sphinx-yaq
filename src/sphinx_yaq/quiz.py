import os

from docutils import nodes
from docutils.parsers.rst import roles
from sphinx.util.docutils import Directive
import docutils.parsers.rst.directives as validators
import base64

class QuizQuestion(nodes.General, nodes.Element):
    pass


def visit_quiz_question_node(self, node):
    """
    Function executed when the node representing the :quiz:`XXX` is visited
    """
    cont = node["content"][7:-1]
    cont = base64.standard_b64encode(cont.encode('utf-8')).decode('ascii')
    #cont = cont.replace("\n","")
    self.body.append('<span class="yaq-q" data-model="%s"></span>' % cont);


def depart_quiz_question_node(self, node):
    """
    Function executed when the node representing the :quiz:`XXX` is left
    """
    # Unused parameters
    del self, node


def quiz_question(name,
               rawtext,
               text,
               lineno,
               inliner,
               options=None,
               content=None):
    """
    Function executed with the role :quiz:`???` is parsed
    """

    # Unused parameters
    del name, text, lineno, content

    # This role has only effect when in HTML mode.
    if inliner.document.settings.env.app.builder.format != 'html':
        return

    config = inliner.document.settings.env.config
    isQuizRunning = config.config_values.get('quiz_running')
    if isQuizRunning is None:
        raise ValueError('Role :quiz: must appear inside a quiz directive.')

    return [QuizQuestion(args=options, content=rawtext)], []





class Quiz(nodes.General, nodes.Element): 
    pass

def visit_quiz_node(self, node):
    """
    Function executed when the node representing .. quiz:: id is visited.
    """
    self.body.append('<div class="yaq" data-model=\'{"title":"%s", "uid":"%s"}\'>'
                     % (node['title'].replace("'","&#39;").replace('"','\\"'),node["args"][0].replace("'","&#39;").replace('"','\\"')))
    

def depart_quiz_node(self, node):
    """
    Function executed when the node representing .. quiz:: id is left.
    """
    self.body.append('</div>')


class QuizDirective(Directive):
    """
    Directive to insert a quizz.
    """

    has_content = True
    required_arguments = 1
    optional_arguments = 1
    final_argument_whitespace = False

    option_spec = {"title":validators.unchanged_required}
    def run(self):
        env = self.state.document.settings.env
        
        # Raise an error if the directive does not have contents.
        self.assert_has_content()
        doc = env.docname
        config = env.config
        
        if config.config_values.get('quiz_running') is not None:
            raise ValueError("Quiz cannot be nested.")

        # Store the type of question in an additional attribute in the
        # environment.
        config.config_values['quiz_running'] = True

        result = Quiz(args=self.arguments, name=self.name, title=self.options["title"])

        # Parse the nested content
        self.state.nested_parse(self.content, self.content_offset, result)

        del config.config_values['quiz_running']

    
        return [result]






class SpoilerBlock(nodes.General, nodes.Element):
    """
    Spoiler block node represented by a <details> tag.
    """
    pass

def visit_spoiler_block_node(self, node):
    """
    Function executed when the node representing the .. spoiler:: is visited
    """
    self.body.append('<details class="yaq-spoiler-block">')
    self.body.append('<summary class="yaq-spoiler-block-title">')
    self.body.append(node["title"])
    self.body.append('</summary>')
    self.body.append('<div class="yaq-spoiler-block-content">')


def depart_spoiler_block_node(self, node):
    """
    Function executed when the node representing the .. spoiler:: is left
    """
    self.body.append('</div></details>')

class SpoilerDirective(Directive):
    """
    Directive to insert a spoiler.
    """

    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = False

    
    def run(self):
        env = self.state.document.settings.env
        
        # Raise an error if the directive does not have contents.
        self.assert_has_content()
        doc = env.docname
        config = env.config
        
        if config.config_values.get('spoiler_running') is not None:
            raise ValueError("Spoiler cannot be nested.")

        # Store the type of question in an additional attribute in the
        # environment.
        config.config_values['spoiler_running'] = True

        result = SpoilerBlock(args=self.arguments, name=self.name, title=self.arguments[0])

        # Parse the nested content
        self.state.nested_parse(self.content, self.content_offset, result)

        del config.config_values['spoiler_running']

    
        return [result]
    


class SpoilerInline(nodes.General, nodes.Element):
    pass

def visit_spoiler_inline_node(self, node):
    """
    Function executed when the node representing the :spoiler:`XXX` is visited
    """
    self.body.append('<span class="yaq-spoiler-inline-hidden" onclick="this.classList.remove(\'yaq-spoiler-inline-hidden\');" >')
                  
                  
    self.body.append(node["content"])
    

def depart_spoiler_inline_node(self, node):
    """
    Function executed when the node representing the :spoiler:`XXX` is left
    """
    self.body.append('</span>')

def spoiler_inline(name,
               rawtext,
               text,
               lineno,
               inliner,
               options=None,
               content=None):
    """
    Function executed with the role :spoiler:`???` is parsed
    """

    # Unused parameters
    #del name, text, lineno, content

    # This role has only effect when in HTML mode.
    if inliner.document.settings.env.app.builder.format != 'html':
        return

    config = inliner.document.settings.env.config

    return [SpoilerInline(args=options, content=text)], []

def setup(app):
    static_path = os.path.join(os.path.dirname(__file__), "_static")
    app.config.html_static_path.append(static_path)

    app.add_js_file("sphinx_yaq/lib/watch.js")
    app.add_js_file("sphinx_yaq/lib/js.cookie.js")
    app.add_js_file("https://www.gstatic.com/firebasejs/4.2.0/firebase.js")
    app.add_js_file("https://www.gstatic.com/firebasejs/ui/2.3.0/firebase-ui-auth__fr.js")
    app.add_js_file("sphinx_yaq/lib/fbconfig.js")
    app.add_js_file("sphinx_yaq/math.js")
    app.add_js_file("sphinx_yaq/yaq.js")

    app.add_css_file("https://use.fontawesome.com/8916f45f90.css")
    app.add_css_file("https://cdn.firebase.com/libs/firebaseui/2.3.0/firebaseui.css")
    app.add_css_file("sphinx_yaq/css/yaq.css")

    app.add_node(Quiz,
                 html=(visit_quiz_node,
                       depart_quiz_node))

    app.add_directive("quiz", QuizDirective)

    roles.register_local_role('quiz', quiz_question)

    app.add_node(QuizQuestion,
                 html=(visit_quiz_question_node,
                       depart_quiz_question_node))
    
    app.add_node(SpoilerBlock,
                 html=(visit_spoiler_block_node,
                       depart_spoiler_block_node))
    
    app.add_directive("spoiler", SpoilerDirective)

    roles.register_local_role('spoiler', spoiler_inline)

    app.add_node(SpoilerInline,
                 html=(visit_spoiler_inline_node,
                       depart_spoiler_inline_node))	
    
