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



    let userData = await Users.findOne({"email":emailId});

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
        
        let agentTokenKey = `AUTH_TOKEN:${String(userData._id)}`;
        await redisClient.set(agentTokenKey, token);
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

        let insertAgentData = {
            "email": getEmailId,
            "providerData":getProviderObj,
            "providerUserId":getProviderUserId,
            "providerType":getProviderType,
            "isEmailVerified": true,
            "isFormSubmitted": false,
            "verificationStatus": "PENDING" ,   
            "notification.permission":true,
            "notification.token":reqFcmToken

        };

        let saveAgentData = await Agents.create([insertAgentData]);
        let getAgentData = saveAgentData[0];

        let setTitle = "";
        let setDesc = "";
        if(getAgentData.verificationStatus == "PENDING"){
            setTitle = "Identity Verification Request Submitted";
            setDesc = "Your request to verify this account is currently under review. You can expect a response within 24 hours.";
        }else if(getAgentData.verificationStatus == "SUCCESS"){
            setTitle = "Identity Successfully Verified";
            setDesc = "Thank you for completing our ID verification process. Please login to access your account.";
        }else if(getAgentData.verificationStatus == "FAILED"){
            setTitle = "Identity Verification Failed";
            setDesc = "We were unable to verify your identity from the documents you submitted.";
        }

        let jwtTokenData = {
            "_id": getAgentData._id,
            "name": getAgentData.name,
            "role": getAgentData.role,
            "companyName": getAgentData.companyName,
            "email": getAgentData.email,
        };

        let encryptedToken = CryptoJS.AES.encrypt(JSON.stringify(jwtTokenData),process.env.CRYPTO_KEY, { vi: process.env.CRYPTO_VI }).toString();
        let encyToken = {
            "encryptedToken": encryptedToken
        }
        
        let token = jwt.sign(encyToken,process.env.JWT_SECRET_KEY, { expiresIn: '7h' });

        let agentTokenKey = `AUTH_TOKEN:${String(getAgentData._id)}`;
        await redisClient.set(agentTokenKey, token);

        return res.status(200).json({
            "data": {
                'accessToken': token,
                'tokenType': 'Bearer',
                'userDetail': {
                    "id": getAgentData._id,
                    "name": getAgentData.name,
                    "companyName":getAgentData.companyName,
                    "role":getAgentData.role,
                    "email": getAgentData.email,
                    "isFormSubmitted":getAgentData.isFormSubmitted,
                    "isEmailVerified":getAgentData.isEmailVerified,
                    "verificationStatus":getAgentData.verificationStatus,
                    "isCompanyLicenceVerified":getAgentData.isCompanyLicenceVerified,
                    "isProofOfAddressVerified":getAgentData.isProofOfAddressVerified,
                },
                "title":setTitle,
                "description":setDesc
            },
            'meta': {
                'message': "Success.",
                'status_code': 200,
                'status': true,
            }
        });


    }
   

}
