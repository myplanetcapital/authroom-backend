let { Validator } = require('node-input-validator');
let Users = require('../models/Users');
const jwt = require('jsonwebtoken');
let axios = require('axios');
let path = require('path');
let fs = require('fs');
let _ = require('lodash');
const CryptoJS = require("crypto-js");
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const { OAuth2Client } = require('google-auth-library');
let generatorPass = require('generate-password');
const otpGenerator = require('otp-generator');
const jwksClient = require("jwks-rsa");
const CLIENT_ID_GOOGLE_ANDROID = '970089445577-jkqobq31pl5gd8t41rkece7p476gq9a2.apps.googleusercontent.com';
const CLIENT_ID_GOOGLE_IOS = '970089445577-go2bg010bh0ba7t86rde063oea94jvf6.apps.googleusercontent.com';
const NodeCache = require("node-cache");
const myCache = new NodeCache();
let SEND_MAIL = require('../vendor/SendMail');


async function key(kid) {
    const client = jwksClient({
        jwksUri: "https://appleid.apple.com/auth/keys",
        timeout: 30000
    });

    return await client.getSigningKey(kid);
}
/*
exports.signIn = async function (req, res) {

    const fieldsValidation = new Validator(req.body, {
        providerType: 'required|in:GOOGLE,APPLE,EMAIL',
        platform:'required|in:ANDROID,IOS',
        token: 'sometimes|required',
        userInfo: 'sometimes|required',
        'userInfo.email': 'sometimes|required|email',
    });

    const isValidated = await fieldsValidation.check();

    if (!isValidated) {

        return res.status(422).json({
            'meta': {
                'message': fieldsValidation.errors,
                'status_code': 422,
                'status': false,
            }
        });

    }


    let reqToken = req.body.token;
    let reqProviderType = req.body.providerType;
    let reqEmail = req.body.userInfo.email;
    let reqPlatform = req.body.platform;


    let emailId = "";
    let providerUserId = "";
    let providerObj = {};
    let providerType = reqProviderType;


    if(reqProviderType == "GOOGLE"){

        let CLIENT_ID_GOOGLE="";
        if(reqPlatform == "ANDROID"){
            CLIENT_ID_GOOGLE = CLIENT_ID_GOOGLE_ANDROID;
        }else if(reqPlatform == "IOS"){
            CLIENT_ID_GOOGLE = CLIENT_ID_GOOGLE_IOS;
        }

        

        const client = new OAuth2Client(CLIENT_ID_GOOGLE);

        try{

            const ticket = await client.verifyIdToken({
                idToken: reqToken,
                audience: CLIENT_ID_GOOGLE,
            })
    
            let getTicketPayload = ticket.payload;
            emailId = getTicketPayload.email;
            providerUserId = getTicketPayload.sub;
            providerObj = getTicketPayload;
            

        }catch(ex){

            console.log(ex);
            return res.status(422).json({
                'meta': {
                    'message': "Google Token May be Expire.",
                    'status_code': 422,
                    'status': false,
                }
            });

        }

       



    }else if(reqProviderType == "APPLE"){

        try{

            const { header } = jwt.decode(reqToken, {
                complete: true
            });
            const kid = header.kid;
            const publicKey = (await key(kid)).getPublicKey();
            const decoded = jwt.verify(reqToken, publicKey , { algorithms: ['RS256'] });
            console.log(decoded);
            emailId = decoded.email;
            providerUserId = decoded.sub;
            providerObj = decoded;
            


        }catch(ex){
            console.log(ex);
            return res.status(422).json({
                'meta': {
                    'message': "Apple Token May be Expire.",
                    'status_code': 422,
                    'status': false,
                }
            });
        }

    }else if(reqProviderType == "EMAIL"){
        // Handle email login
    }


    let userData = await Users.findOne({"providerType":providerType,"providerUserId":providerUserId});

    if(userData){

        if (userData.status !== 'ACTIVE') {

            return res.status(422).json({
                'meta': {
                    'message': "Your account has been locked, Please contact your upline.",
                    'status_code': 422,
                    'status': false
                }
            });
        }

       
        let jwtTokenData = {
            "_id": userData._id,
            "role": userData.role,
            "email": userData.email,
        };

        let encryptedToken = CryptoJS.AES.encrypt(JSON.stringify(jwtTokenData),process.env.CRYPTO_KEY, { vi: process.env.CRYPTO_VI }).toString();
        let encyToken = {
            "encryptedToken": encryptedToken
        }
        
        let token = jwt.sign(encyToken,process.env.JWT_SECRET_KEY, {});

        let userTokenKey = `AUTH_TOKEN:${String(userData._id)}`;
        await redisClient.set(userTokenKey, token);

        return res.status(200).json({
            "data": {
                'accessToken': token,
                'tokenType': 'Bearer',
                'userDetail': {
                    "id": userData._id,
                    "role":userData.role,
                    "email": userData.email,
                    "isEmailVerified":userData.isEmailVerified
                }
            },
            'meta': {
                'message': "Success.",
                'status_code': 200,
                'status': true,
            }
        });



    }else{

        let insertUserData = {
            "email": emailId,
            "providerData":providerObj,
            "providerUserId":providerUserId,
            "providerType":providerType,
            "isEmailVerified": false
        };

        let saveUserData = await Users.create([insertUserData]);
        let userData = saveUserData[0];

    
        let jwtTokenData = {
            "_id": userData._id,
            "role": userData.role,
            "email": userData.email
        };

        let encryptedToken = CryptoJS.AES.encrypt(JSON.stringify(jwtTokenData),process.env.CRYPTO_KEY, { vi: process.env.CRYPTO_VI }).toString();
        let encyToken = {
            "encryptedToken": encryptedToken
        }
        
        let token = jwt.sign(encyToken,process.env.JWT_SECRET_KEY, {});

        let userTokenKey = `AUTH_TOKEN:${String(userData._id)}`;
        await redisClient.set(userTokenKey, token);

        return res.status(200).json({
            "data": {
                'accessToken': token,
                'tokenType': 'Bearer',
                'userDetail': {
                    "id": userData._id,
                    "role":userData.role,
                    "email": userData.email,
                    "isEmailVerified":userData.isEmailVerified
                }
            },
            'meta': {
                'message': "Success.",
                'status_code': 200,
                'status': true,
            }
        });


    }
   

}*/

exports.signIn = async function (req, res) {
    try {

        const fieldsValidation = new Validator(req.body, {
            providerType: 'required|in:GOOGLE,APPLE,EMAIL',
            platform: 'required|in:ANDROID,IOS',
            token: 'sometimes|required',
            userInfo: 'sometimes|required',
            'userInfo.email': 'sometimes|required|email',
            otp: 'sometimes|required'
        });

        const isValidated = await fieldsValidation.check();

        if (!isValidated) {

            return res.status(422).json({
                'meta': {
                    'message': fieldsValidation.errors,
                    'status_code': 422,
                    'status': false,
                }
            });

        }

        const { providerType, token, platform, email, otp } = req.body;

        let providerUserId;
        let emailId;
        let providerObj = {};

        /* ---------------- SOCIAL LOGIN ---------------- */

        if (providerType === "GOOGLE") {

            const CLIENT_ID =
                platform === "ANDROID"
                    ? CLIENT_ID_GOOGLE_ANDROID
                    : CLIENT_ID_GOOGLE_IOS;

            const client = new OAuth2Client(CLIENT_ID);
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: CLIENT_ID
            });

            const payload = ticket.payload;
            providerUserId = payload.sub;
            emailId = payload.email;
            providerObj = payload;
        }

        if (providerType === "APPLE") {

            const { header } = jwt.decode(token, { complete: true });
            const publicKey = (await key(header.kid)).getPublicKey();

            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

            providerUserId = decoded.sub;
            emailId = decoded.email || null; // Apple may hide email
            providerObj = decoded;
        }

        /* ---------------- EMAIL OTP LOGIN ---------------- */

        if (providerType === "EMAIL") {

            if (!otp) {
                await sendEmailOtp(email);
                return res.json({
                    meta: { status: true, message: "OTP sent to email" }
                });
            }

            await verifyEmailOtp(email, otp);
            providerUserId = email;
            emailId = email;
        }

        /* ---------------- AUTH PROVIDER CHECK ---------------- */

        let auth = await AuthProviders.findOne({
            providerType,
            providerUserId
        });

        let user;

        if (auth) {
            user = await Users.findById(auth.userId);
        } else {

            if (emailId) {
                user = await Users.findOne({ email: emailId });
            }

            if (!user) {
                user = await Users.create({
                    email: emailId,
                    isEmailVerified: providerType !== "EMAIL",
                    status: "ACTIVE"
                });
            }

            await AuthProviders.create({
                userId: user._id,
                providerType,
                providerUserId,
                providerData: providerObj
            });
        }

        /* ---------------- ACCOUNT STATUS CHECK ---------------- */

        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                meta: { status: false, message: "Account locked" }
            });
        }

        /* ---------------- TOKEN GENERATION ---------------- */

        const jwtPayload = {
            _id: user._id,
            role: user.role,
            email: user.email
        };

        const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(jwtPayload),
            process.env.CRYPTO_KEY
        ).toString();

        const tokenJwt = jwt.sign(
            { encryptedToken: encrypted },
            process.env.JWT_SECRET_KEY
        );

        await redisClient.set(`AUTH_TOKEN:${user._id}`, tokenJwt);

        return res.json({
            data: {
                accessToken: tokenJwt,
                tokenType: "Bearer",
                userDetail: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified
                }
            },
            meta: { status: true, message: "Success" }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            meta: { status: false, message: "Server error" }
        });
    }
};

