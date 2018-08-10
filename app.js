const express = require('express')
const app = express()
const swig = require('swig')
const mailer = require('express-mailer')
const path = require('path')
const bodyParser = require('body-parser');
const fs = require('fs')
const ejs = require('ejs')
const crypto = require('crypto')
const {
    promisify
} = require('util')
const argon2 = require('argon2')

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const appendFile = promisify(fs.appendFile)

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

app.get('/recup_mdp', function (req, res, next) {
    res.render('recup_mdp')
})

app.post('/recup_mdp', async function (req, res, next) {

    mailer.extend(app, {
        host: 'smtp.gmail.com',
        secureConnection: false,
        port: 25,
        transportMethod: 'SMTP',
        auth: {
            user: 'my mail',
            pass: 'my mdp'
        }
    });

    const token = crypto.randomBytes(16).toString("hex");
    console.log(token);

    let fileContent = await readFile(req.body.user_pseudo + ".json"); // 1re étape
    const user = JSON.parse(fileContent); // 2ème étape
    user.token = token                     // 3ème étape
    console.log(user) // return obj
    let stringUser = JSON.stringify(user, false, 4) // 4ème étape
    await writeFile(req.body.user_pseudo + ".json", stringUser) // 5ème étape


    let mailOptions = {
        to: req.body.user_mail,
        subject: 'Reset password',
        user: {
            token: token,
            user_pseudo: req.body.user_pseudo
        }
    }

    app.mailer.send('mail_reset_password', mailOptions, function (err) {
        if (err) {
            console.log(err);
            res.send('There was an error sending the email');
            return;
        }
        return res.send('Email de récupération de mot de passe envoyé!');
    });



})


app.get('/change_password/:pseudo/:id', async function (req, res) {
    res.render("change_password", req.params)
})

app.post('/change_password', async function (req, res) {
    console.log(req.body)
    let fileContent = await readFile(req.body.user_pseudo + ".json")
    let user = JSON.parse(fileContent)
    if (req.body.token === user.token) {
        if (req.body.new_pass === req.body.confirm_pass) {
            user.pass = await argon2.hash(req.body.confirm_pass)
            user.token = undefined
            let stringPass = await JSON.stringify(user, false, 4)
            await writeFile(req.body.user_pseudo + ".json", stringPass)
            res.render('change_password_success', req.params)
        }
        else {
            res.render('change_password_failed')
        }
    }
    else {
        res.render('change_password_failed')
    }
})

app.listen(3000);
console.log('app running in : http://localhost:3000')
