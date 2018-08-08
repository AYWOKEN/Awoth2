const express = require('express');
const app = express();
const swig = require('swig');
const mailer = require('express-mailer');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const ejs = require('ejs');
const {
    promisify
} = require('util');
const argon2 = require('argon2');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

app.set('view engine', 'ejs');
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
        const data = await readFile(req.body.user_pseudo + ".json");
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
        form: "",
        host: 'smtp.gmail.com',
        secureConnection: true,
        port: 25,
        transportMethod: 'SMTP',
        auth: {
            user: '',
            pass: ''
        }
    });

    var mailOptions = {
        to: req.body.user_mail,
        subject: 'Reset password',
        user: {
            password: '123456',
        }
    }

    // Send email.
    app.mailer.send('mail_reset_password', mailOptions, function (err) {
        if (err) {
            console.log(err);
            res.send('There was an error sending the email');
            return;
        }
        return res.send('Email has been sent!');
    });

})




app.listen(3000);
console.log('app running in : http://localhost:3000')