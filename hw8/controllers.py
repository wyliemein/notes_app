"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

import uuid
import datetime


from py4web import action, request, abort, redirect, URL, Field
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.url_signer import URLSigner

from yatl.helpers import A
from . common import db, session, T, cache, auth, signed_url

# Let us import some convenience functions.
from .models import get_user

from .components.starrater import StarRater

class NoteRater(StarRater):

    def get_stars(self, id=None):
        if id is None:
            return dict(num_stars=0)
        s = db((db.stars.note == int(id)) &
               (db.stars.rater == get_user())).select().first()
        return dict(num_stars=None if s is None else s.rating)

    def set_stars(self, id=None):
        assert id is not None
        db.stars.update_or_insert(
            ((db.stars.note == int(id)) & (db.stars.rater == get_user())),
            note = int(id),
            rater = get_user(),
            rating = int(request.params.num_stars),
        )
        return "ok"


note_rater = NoteRater('stars', session, db=db)

url_signer = URLSigner(session)

# The auth.user below forces login.
@action('index')
@action.uses('index.html', url_signer, session, db, auth.user, auth)
def index():
    return dict(
        delete_url = URL('delete_note', signer=url_signer),
        notes_url = URL('notes', signer=url_signer),
        author_name = auth.current_user.get('id'),
    )

@action('notes', method="GET")
@action.uses(url_signer.verify(), auth.user, db, auth)
def get_notes():
    notes = db((db.notes.starred == True) & (db.notes.author == auth.current_user.get('id'))).select(orderby=~db.notes.last_modified).as_list()
    notes_unstarred = db((db.notes.starred == False) & (db.notes.author == auth.current_user.get('id'))).select(orderby=~db.notes.last_modified).as_list()
    notes = notes + notes_unstarred
    return dict(notes=notes)

@action('notes', method="POST")
@action.uses(url_signer.verify(), auth.user, db)
def set_notes():
    id = request.json.get('id') # Note: id can be none.
    content = request.json.get('content')
    starred = request.json.get('starred')
    title = request.json.get('title')
    author = request.json.get('author')
    color = request.json.get('color')
    if id is not None:
        note = db(db.notes.id == id).select().first()
        note.update_record(content=content, starred=starred, title=title, author=author, color=color, last_modified=datetime.datetime.now())
    else:
        id = db.notes.insert(content=content, starred=starred, title=title, author=author, color=color)
    return dict(content=content, id=id, title=title, starred=starred, color=color)

@action('delete_note',  method="POST")
@action.uses(db, auth.user, session, url_signer.verify(), auth)
def delete_note():
    db((db.notes.id == request.json.get('id')) & (db.notes.author == auth.current_user.get('id'))).delete()
    return "ok"

