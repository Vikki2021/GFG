let express = require("express")

const User = require("../models/user");
let router = express.Router();

let session = require("express-session");
let cookieParser = require("cookie-parser");
let nodemailer = require("nodemailer");
let checkAuthenticationV2 = require("../middleWares/checkAuthMiddleware");
const {response} = require("express");

let transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
      user: 'sajeev.mahajan.spam@gmail.com',
      pass: 'ypdlqcyhfdwoblpw'
   }
});



const oneDay = 1000 * 60 * 60 * 24;
router.use(session({
    secret: "This is my own secret",
    saveUninitialized: true,
    cookie: { maxAge: oneDay},
    resave: false
}));
router.use(cookieParser());


// 1st Request : create session
// 2nd Request : modify session -> updated
// 3rd Request : no change to session ->

let checkAuthentication = (request, response, next) => {
    // update password
    // find user and then check if password is correct
    User.findOne({username: request.body.username}, (err, result) => {
        console.log(result);

        if(err){
            response.send("Authentication fails");
        } else {
            if(result.password === request.body.oldPassword) {
                console.log("Authentication Succeed !");
                next();
            } else {
                response.send("Authentication fails");
            }
        }
    });

}




router.post("/signup", async (request,response) => {

    let existingUser = await User.findOne({username: request.body.username});
    if(existingUser != null)
        response.send("User already exist !");

    const user = new User({name: request.body.name, age:request.body.age,username: request.body.username, password: request.body.password, email: request.body.email}); // document of the collection defined using mongoose.model
    await user.save(); // saving that document in the collection
    response.send(user);
})

router.post("/login",async (request,response) => {
    // /user : we were trying to authenticate the user and then sending success response
    let user = await User.findOne({username: request.body.username});
    if( user !=null && user.password === request.body.password) {
        // create session over here !
        request.session.username = user.username;
        console.log(request.session);
        response.send("User is authenticated!").status(200);
    } else {
        response.send("No user found !").status(501);
    }
});


router.get("/:username",checkAuthenticationV2, (request,response) => {

    let user = User.findOne({username: request.params.username}, function(err, result) {
        if(err) {
            response.send(err);
        } if( user.username === request.session.username) {
            response.send(result);
        }
    });
});


router.put("/updatePassword/:id",(request,response)=>{

    if(request.session.token != request.params.id)
        response.send("Invalid Access");
    else {
        console.log("Access granted to update password !")
        request.session.destroy();
    }

    User.findOneAndUpdate({username: request.body.username},{ password: request.body.newPassword}, function(err,result){
        if(err) {
            response.send(err);
        } else {
             if(!result)
                 response.send("No user found");
             else
                 response.send(result);
        }
    })
})

// Problem Statement :
//Assignment : Solve using Session, How ?
router.post("/updatePassword",async (request,response)=>{
    let user = await User.findOne({username: request.body.username});
    let randomNumber = Math.random();

    if (user) {
        let mailOptions = {
            from: "sajeev.mahajan.spam@gmail.com",
            to: request.body.email,
            subject: "Update Password",
            text: `Please update your password. [PUT] http://localhost:8080/user/updatePassword?id=${randomNumber}  Sent by nodemailer using node.js`
        }

        transporter.sendMail(mailOptions, function(error,result) {
            if(error) {
                console.log(error);
                response.send(error);
            } else {
                console.log("Email sent : " + result.response);
                // Initialise the session
                request.session.token = randomNumber;
                // request.session.tokenExpirationTime = new Date() + 10 * 60 * 1000;
                response.send(result.response);
            }
        })


    } else {
        response.send("No user found with username : " +  request.body.username);
    }

})

router.get("/logout",checkAuthenticationV2,(request,response)=>{
    request.session.destroy();
    response.send("Logged Out !");
})


module.exports = router;