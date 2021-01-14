// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        notes: []
    };

    app.index = (a) => {
        // Adds to the notes all the fields on which the UI relies.
        let i = 0;
        for (let n of a) {
            n._idx = i++;
            n.edit = n.edit;
            n.title = n.title;
            n.color = n.color;
            n.starred = n.starred;
            n.content = n.content;
            n.server_color = n.color;
            n.server_starred = n.starred;
            n.server_title = n.title;
            n.server_content = n.content; // Content on the server.
            n.deletable = n.deletable;
        }
        return a;
    };
    
    app.do_edit = (note_idx) => {
        let n = app.vue.notes[note_idx];
        n.edit = true;
    };

    app.set_star = (note_idx, star_value) => {
        let n = app.vue.notes[note_idx];
        n.starred = star_value;
    };

    app.set_color = (note_idx, color_value) => {
        let n = app.vue.notes[note_idx];
        n.color = color_value;
    }

    app.delete_note = (note_idx) => {
        let n = app.vue.notes[note_idx];
        n.deletable = true;
    }
    
    app.cancel = (note_idx) => {
        let n = app.vue.notes[note_idx];
        n.deletable = false;
    }

    app.random_color = () => {
        var colors = ["purple", "light-purple", "lumber", "green", "pink"];
        var num = Math.floor(Math.random() * colors.length);  
        return colors[num];
    }

    app.do_save = (note_idx) => {
        let n = app.vue.notes[note_idx];
        if (n.content !== n.server_content || n.title !== n.server_title || n.starred !== n.server_starred || n.color !== n.server_color) {
            axios.post(notes_url, {
                content: n.content,
                id: n.id,
                title: n.title,
                color: n.color,
                starred: n.starred,
                author: n.author,
            }).then((result) => {
                console.log("Received:", result.data);
                n.server_content = result.data.content;
                n.server_title = result.data.title;
                n.server_starred = result.data.starred;
                n.server_color = result.data.color;
                n.id = result.data.id;           
                n.edit = false;
                axios.get(notes_url).then((result)=>{ 
                    let notes = result.data.notes;
                    app.vue.notes = app.index(notes);
                })
            }).catch(() => {
                console.log("Caught error");
            });
        } else {
            n.edit = false;
        }
    }

    app.add_note = () => {
        let q = {
            id: null,
            edit: false,
            title:"",
            color: app.random_color(),
            starred: false,
            content: "",
            server_content: "",
            server_title: "",
            server_starred: false,
            server_color: "",
            author: author_name,
            deletable: false,
        };
        app.vue.notes.unshift(q);
        app.vue.notes = app.index(app.vue.notes);
    };

    app.do_delete = (note_idx) => {
        let n = app.vue.notes[note_idx];
        if (n.id === null) {
            app.vue.notes.splice(note_idx, 1);
            app.vue.notes = app.index(app.vue.notes);
        } else {
            axios.post(delete_url, {id: n.id}).then(()=> {
                app.vue.notes.splice(note_idx, 1);
                app.vue.notes = app.index(app.vue.notes);
            });
        }
    };

    // We form the dictionary of all methods, so we can assign them
    // to the Vue app in a single blow.
    app.methods = {
        do_edit: app.do_edit,
        do_save: app.do_save,
        add_note: app.add_note,
        do_delete: app.do_delete,
        set_star: app.set_star,
        set_color: app.set_color,
        delete_note: app.delete_note,
        cancel: app.cancel,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        axios.get(notes_url).then((result) => {
            let notes = result.data.notes;
            app.vue.notes = app.index(notes);
        })
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
