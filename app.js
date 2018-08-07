const express = require('express')
const app = express()
const swig = require('swig')
const mailer = require('express-mailer')
const path = require('path')
const bodyParser = require('body-parser');
const fs = require('fs')
const ejs = require('ejs')
const {
    promisify
} = require('util')
const argon2 = require('argon2')

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: false
}))


app.get('/', function (req, res) {
    res.send("Bienvenu sur mon système d'auth")
})

app.get('/inscription', function (req, res) {
    res.render('inscription')
})

app.post('/inscription', async (req, res) => {

    console.log(req.body)

    await writeFile(`${req.body.user_pseudo}.json`, JSON.stringify({
        ...req.body,
        pass: await argon2.hash(req.body.pass)
    }, false, 4))



    res.render('inscription_success')
})


app.get('/login', function (req, res) {
    res.render('login');
})

app.post('/login', async (req, res) => {
    try {
        const data = await readFile(req.body.user_pseudo + ".json")
        const user = JSON.parse(data)
        if (await argon2.verify(user.pass, req.body.pass)) {
            res.render('login_success')
        } else {
            res.render('login_failed')
        }
    } catch (error) {
        res.render('login_failed')
    }
})

app.get('/recup_mdp', function (req, res) {
    res.render('recup_mdp')
})

app.post('/recup_mdp', function (req, res, next) {
    mailer.extend(app, {
        host: 'smtp.gmail.com',
        secureConnection: false,
        port: 25,
        transportMethod: 'SMTP',
        auth: {
            user: 'my email',
            pass: 'the pass of my mail'
        }

    });

    app.mailer.send('mdprecup', {
        to: req.body.user_mail,
        from: "monsitedemalade",
        subject: "Récupération du mot de passe",
        message: req.body.pass
    }, function (err) {
        if (err) {
            console.log('We have an error !');
            console.log(err)
            return;
            res.render('echec')
        }
        res.send('Email envoyé', { name: req.body.pass });
    });


})




app.listen(3000);
console.log('app running in : http://localhost:3000')