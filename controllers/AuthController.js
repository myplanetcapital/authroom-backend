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
const CLIENT_ID_GOOGLE_ANDROID = '559968810939-pk8itt3a951d8eo4dc38e4rf1qgci36a.apps.googleusercontent.com';
const CLIENT_ID_GOOGLE_IOS = '559968810939-n53urtm0b2n4h88q5p24bvvhulgfujrt.apps.googleusercontent.com';
const NodeCache = require("node-cache");
const myCache = new NodeCache();
let sendEmailOtp = require('../vendor/sendEmailOtp');
const crypto = require("crypto");
let verifyEmailOtp = require('../vendor/verifyEmailOtp');

const {
    generateRegistrationOptions,
    generateAuthenticationOptions,
    verifyRegistrationResponse,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { isoBase64URL } = require('@simplewebauthn/server/helpers');

const rpName = 'Auth Room';
const rpID = 'api.authroom.com';
const origin = 'https://authroom.com';


async function verifyFacebookToken(userAccessToken) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    const appAccessToken = `${appId}|${appSecret}`;

    const url = `https://graph.facebook.com/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`;

    console.log(url);

    const response = await axios.get(url);

    return response.data;
}

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

exports.startRegistration = async function (req, res) {

    const fieldsValidation = new Validator(req.body, {
        "deviceId": 'required|string',
        "platform": 'required|in:ANDROID,IOS',
        'userInfo.email': 'required|email'
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

    let email = req.body.userInfo ? req.body.userInfo.email : null;
    //let deviceId = req.body.deviceId ? req.body.deviceId : null;

    let userData = await Users.findOne({ "email": email });

    if (!userData) {

        userData = await Users.create({
            email: email,
            providerType: "PASSKEY",
            isEmailVerified: true
        });
    }

    if (!userData.passkeyUserId) {
        userData.passkeyUserId = Buffer.from(userData._id.toString());
        await userData.save();
    }


    const userIdBuffer = Buffer.from(userData._id.toString());

    const options = await generateRegistrationOptions({
        rpName: rpName,
        rpID: rpID,
        userID: userIdBuffer,
        userName: email,
        userDisplayName: email,
        timeout: 60000,
        attestationType: "none",
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'required',
            authenticatorAttachment: 'platform',
            requireResidentKey: false,
        }
    });

    await redisClient.setex(`PASSKEY_CHALLENGE:${email}`, 300, options.challenge);

    return res.status(200).json({
        'data': options,
        'meta': {
            'message': "Start Registration",
            'status_code': 200,
            'status': true,
        }
    });


}

exports.verifyRegistration = async function (req, res) {

    const fieldsValidation = new Validator(req.body, {
        "attestationResponse": 'required',
        "deviceId": 'required|string',
        "platform": 'required|in:ANDROID,IOS',
        'userInfo.email': 'required|email'
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

    const reqAttestationResponse = req.body.attestationResponse;
    let email = req.body.userInfo ? req.body.userInfo.email : null;


    const expectedChallenge = await redisClient.get(`PASSKEY_CHALLENGE:${email}`);
    console.log(expectedChallenge);

    if (!expectedChallenge) {

        return res.status(422).json({
            'meta': {
                'message': "Challenge not found or may expired.",
                'status_code': 422,
                'status': false,
            }
        });

    }

    const verification = await verifyRegistrationResponse({
        response: reqAttestationResponse,
        expectedChallenge: expectedChallenge,
        expectedOrigin: "android:apk-key-hash:XwPY03hLcxjPEWZYaLORii9VjqjN8ieIQ0YfS6FQru4",
        expectedRPID: rpID
    });

    console.log({
        response: reqAttestationResponse,
        expectedChallenge: expectedChallenge,
        expectedOrigin: "android:apk-key-hash:XwPY03hLcxjPEWZYaLORii9VjqjN8ieIQ0YfS6FQru4",
        expectedRPID: rpID
    });

    console.log(verification);

    if (verification.verified) {

        

        const { credential } = verification.registrationInfo;
        let credentialPublicKey = credential.publicKey;
        let credentialID = credential.id;
        let counter = credential.counter;
        let transports = credential.transports;

        const userData = await Users.findOne({ "email": email});

        userData.credentials.push({
            credentialID: credentialID,
            publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
            counter,
            transports
        });

        await userData.save();

        return res.status(200).json({
            'data': {
                "verified": true
            },
            'meta': {
                'message': "Credential Verified.",
                'status_code': 200,
                'status': true,
            }
        });

    } else {

        return res.status(422).json({
            'data': {
                "verified": false
            },
            'meta': {
                'message': "Credential Not Verified.",
                'status_code': 422,
                'status': false,
            }
        });

    }



}

exports.startLogin = async function (req, res) {

    const fieldsValidation = new Validator(req.body, {
        "deviceId": 'required|string',
        "platform": 'required|in:ANDROID,IOS',
        'userInfo.email': 'required|email'
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

    let email = req.body.userInfo ? req.body.userInfo.email : null;

    const userData = await Users.findOne({ "email": email});

    if (!userData) {

        return res.status(422).json({
            'meta': {
                'message': "User not found.",
                'status_code': 422,
                'status': false,
            }
        });

    }

    if (userData.credentials.length == 0) {

        return res.status(422).json({
            'meta': {
                'message': "User not found.",
                'status_code': 422,
                'status': false,
            }
        });

    }


    const options = await generateAuthenticationOptions({
        rpID: rpID,
        allowCredentials: userData.credentials.map((cred) => ({
            id: cred.credentialID,
            type: "public-key",
            transports: cred.transports
        })),
        userVerification: "preferred"
    });


    await redisClient.setex(`PASSKEY_CHALLENGE:${email}`, 300, options.challenge);

    return res.status(200).json({
        "data": options,
        'meta': {
            'message': "Start Login.",
            'status_code': 200,
            'status': true,
        }
    });


}

exports.verifyLogin = async function (req, res) {

    const fieldsValidation = new Validator(req.body, {
        "attestationResponse": 'required',
        "deviceId": 'required|string',
        "platform": 'required|in:ANDROID,IOS',
        'userInfo.email': 'required|email'
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

    const reqAttestationResponse = req.body.attestationResponse;
    let reqId = reqAttestationResponse.id;
    let email = req.body.userInfo ? req.body.userInfo.email : null;

    const expectedChallenge = await redisClient.get(`PASSKEY_CHALLENGE:${email}`);

    if (!expectedChallenge) {

        return res.status(422).json({
            'meta': {
                'message': "Challenge not found or may expired",
                'status_code': 422,
                'status': false,
            }
        });

    }

    const userData = await Users.findOne({ "email": email});

    if (!userData) {
        return res.status(422).json({
            'meta': {
                'message': "User not found",
                'status_code': 422,
                'status': false,
            }
        });

    }

    const credential = userData.credentials.find(
        c => c.credentialID === reqId
    );

    if (!credential) {

        return res.status(422).json({
            'meta': {
                'message': "User credential not found",
                'status_code': 422,
                'status': false,
            }
        });

    }


    const verification = await verifyAuthenticationResponse({
        response: reqAttestationResponse,
        expectedChallenge: expectedChallenge,
        expectedOrigin: "android:apk-key-hash:XwPY03hLcxjPEWZYaLORii9VjqjN8ieIQ0YfS6FQru4",
        expectedRPID: rpID,
        credential: {
            id: credential.credentialID,
            publicKey: isoBase64URL.toBuffer(credential.publicKey),
            counter: credential.counter
        }
    });


    if (verification.verified) {
        credential.counter = verification.authenticationInfo.newCounter;
        await userData.save();



        const jwtPayload = {
            _id: userData._id,
            role: userData.role,
            email: userData.email
        };

        const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(jwtPayload),
            process.env.CRYPTO_KEY
        ).toString();

        const tokenJwt = jwt.sign(
            { encryptedToken: encrypted },
            process.env.JWT_SECRET_KEY
        );

        await redisClient.set(`AUTH_TOKEN:${userData._id}`, tokenJwt);

        return res.status(200).json({
            data: {
                "verified": true,
                accessToken: tokenJwt,
                tokenType: "Bearer",
                userDetail: {
                    id: userData._id,
                    email: userData.email,
                    role: userData.role,
                    isEmailVerified: userData.isEmailVerified
                }
            },
            meta: {
                message: "Success",
                status_code: 200,
                status: true
            }
        });


    } else {
        return res.status(422).json({
            'data': {
                "verified": false
            },
            'meta': {
                'message': "Credential Not Verified.",
                'status_code': 422,
                'status': false,
            }
        });
    }


    /*
        const { username, assertionResponse } = req.body;
    
        const user = users.get(username);
    
        const device = user.devices.find(dev =>
            dev.credentialID.equals(Buffer.from(assertionResponse.rawId, "base64url"))
        );
    
        if (!device) {
            return res.status(400).json({ error: "Device not found" });
        }
    
        let verification;
    
        try {
    
            verification = await verifyAuthenticationResponse({
    
                response: assertionResponse,
    
                expectedChallenge: user.currentChallenge,
    
                expectedOrigin: origin,
    
                expectedRPID: rpID,
    
                authenticator: device
            });
    
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    
        const { verified, authenticationInfo } = verification;
    
        if (verified) {
            device.counter = authenticationInfo.newCounter;
        }
    
        res.json({ verified });*/

}


exports.signIn = async function (req, res) {

    try {

        const fieldsValidation = new Validator(req.body, {
            providerType: 'required|in:GOOGLE,APPLE,EMAIL,FACEBOOK,PASSKEY',
            platform: 'required|in:ANDROID,IOS',
            token: 'required|sometimes',
            otp: 'required|sometimes',
            userInfo: 'required|sometimes',
            'userInfo.email': 'required|sometimes|email',

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

        let providerType = req.body.providerType;
        let platform = req.body.platform;
        let email = req.body.userInfo ? req.body.userInfo.email : null;
        let token = req.body.token;
        let otp = req.body.otp;



        let providerUserId;
        let emailId;
        let providerObj = {};

        /* ---------------- SOCIAL LOGIN ---------------- */

        if (providerType === "GOOGLE") {

            try {



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
            } catch (ex) {

                return res.status(422).json({
                    'meta': {
                        'message': "Google Token May be Expire.",
                        'status_code': 422,
                        'status': false,
                    }
                });

            }
        }

        if (providerType === "APPLE") {

            try {

                const { header } = jwt.decode(token, { complete: true });
                const publicKey = (await key(header.kid)).getPublicKey();

                const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

                providerUserId = decoded.sub;
                emailId = decoded.email || null; // Apple may hide email
                providerObj = decoded;

            } catch (ex) {

                return res.status(422).json({
                    'meta': {
                        'message': "Apple Token May be Expire.",
                        'status_code': 422,
                        'status': false,
                    }
                });

            }
        }

        if (providerType === "FACEBOOK") {

            try {

                const fbData = await verifyFacebookToken(token);

                console.log(fbData);

                if (!fbData.data.is_valid) {
                    throw new Error("Invalid Facebook token");
                }

                console.log(fbData);

                const facebookUserId = fbData.data.user_id;
                providerUserId = facebookUserId;
                emailId = fbData.data.email || null;
                providerObj = fbData.data;

                return false;

            } catch (ex) {
                console.log(ex);
                return res.status(422).json({
                    'meta': {
                        'message': "Facebook Token May be Expire Or Invalid.",
                        'status_code': 422,
                        'status': false,
                    }
                });

            }
        }


        /* ---------------- EMAIL OTP LOGIN ---------------- */
        let isEmailOtpVerified = false;
        if (providerType === "EMAIL") {

            if (!otp) {
                let isUserExists = await Users.findOne({ email: email, providerType: "EMAIL" });
                await sendEmailOtp(email, isUserExists ? "LOGIN" : "REGISTER");
                return res.status(200).json({
                    'meta': {
                        'message': "OTP sent to email",
                        'status_code': 200,
                        'status': true,
                    }
                });
            }

            try {
                await verifyEmailOtp(email, otp);
                isEmailOtpVerified = true;
            } catch (err) {
                return res.status(422).json({
                    'meta': {
                        'message': err.message,
                        'status_code': 422,
                        'status': false,
                    }
                });
            }

            providerUserId = email;
            emailId = email;
        }

        /* ---------------- AUTH PROVIDER CHECK ---------------- */

        let user = await Users.findOne({
            $or: [
                {
                    providerType: providerType,
                    providerUserId: providerUserId
                },
                ...(emailId ? [{ email: emailId }] : [])
            ]
        });


        // 2️⃣ Create or update user
        if (!user) {

            // 🆕 New user
            user = await Users.create({
                email: emailId || null,
                providerType: providerType,
                providerUserId: providerUserId,
                providerData: providerObj,
                isEmailVerified: providerType !== "EMAIL" || isEmailOtpVerified,
                status: "ACTIVE"
            });

        } else {

            // 🔁 Existing user → update provider info
            user.providerType = providerType;
            user.providerUserId = providerUserId;
            user.providerData = providerObj;

            // Set email if missing
            if (emailId && !user.email) {
                user.email = emailId;
            }

            // Social login auto-verifies email
            if (providerType !== "EMAIL" || isEmailOtpVerified) {
                user.isEmailVerified = true;
            }

            await user.save();
        }



        /* ---------------- ACCOUNT STATUS CHECK ---------------- */

        if (user.status !== "ACTIVE") {
            return res.status(422).json({
                'meta': {
                    'message': "Account locked",
                    'status_code': 422,
                    'status': false,
                }
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

        return res.status(200).json({
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
            meta: {
                message: "Success",
                status_code: 200,
                status: true
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(422).json({
            'meta': {
                'message': "Server error",
                'status_code': 422,
                'status': false,
            }
        });

    }
};

