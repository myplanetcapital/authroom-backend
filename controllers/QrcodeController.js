const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const sharp = require("sharp");
const path = require("path");
const Providers = require("../models/Providers");
const { QRCodeStyling } = require('qr-code-styling/lib/qr-code-styling.common.js');
const nodeCanvas = require('canvas');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const { Validator } = require('node-input-validator');





const users = {};


exports.generateQRCode = async (req, res) => {

     const fieldsValidation = new Validator(req.body, {
        providerId: 'required|string',
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

    let reqProviderId = req.body.providerId

    let providerData = await Providers.findOne({ providerId: reqProviderId });

    if(!providerData){
        return res.status(422).json({
            'meta': {
                'message': "Provider does not exist",
                'status_code': 422,
                'status': false,
            }
        }); 
    }

    let providerSecret = providerData.secret;
    let providerAppName = providerData.appName;
    let providerLogo = providerData.logo;


    const userId = "698881f886cd2d5a4461604a";
    const secret = authenticator.generateSecret();
    
    users[userId] = { secret };
    const otpauth = authenticator.keyuri(userId, providerAppName, providerSecret);

    console.log(otpauth);


    const options = {
        width: 300,
        height: 300,
        shape: "square",
        data: otpauth,
        image: providerLogo,
        qrOptions: {
            errorCorrectionLevel: "Q",
            margin: 0 
        },
        dotsOptions: {
            type: "extra-rounded",   // ⬅ closest to abstract look
            color: "#000000"
        },
        cornersSquareOptions: {
            type: "extra-rounded",   // outer eye shape
            color: "#000000"
        },
        cornersDotOptions: {
            type: "dot",             // inner eye circle
            color: "#000000"
        },
        backgroundOptions: {
            color: "#ffffff"
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 0,         // logo safe zone
            imageSize: 0.25
        }
    }

   
    const qrCodeImage = new QRCodeStyling({
        jsdom: JSDOM, // this is required
        nodeCanvas, // this is required,
        ...options,
        imageOptions: {
            saveAsBlob: true,
            crossOrigin: "anonymous",
            //margin: 3
        },
    });

    let finalBuffer = await qrCodeImage.getRawData("png");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.send(finalBuffer);



};



/*exports.generateQRCode = async (req, res) => {

        const  username  = "test";
        const secret = authenticator.generateSecret();
        users[username] = { secret };
    
        const otpauth = authenticator.keyuri(username, 'MyApp', secret);
        
        const logoPath = path.join(__basedir, "logo.png");

        // 1️⃣ Generate QR code as buffer
        const qrBuffer = await QRCode.toBuffer(otpauth, {
            errorCorrectionLevel: "H",
            type: "png",
            width: 500,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#FFFFFF"
            }
        });

        // 2️⃣ Resize logo
        const logoBuffer = await sharp(logoPath)
            .resize(100, 100)
            .png()
            .toBuffer();

        // 3️⃣ Composite logo on QR
        const finalBuffer = await sharp(qrBuffer)
            .composite([
                {
                    input: logoBuffer,
                    gravity: "center"
                }
            ])
            .png()
            .toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        return res.send(finalBuffer);
}*/





exports.verifyCode = async (req, res) => {

    const username = "test"
    const token = req.body.token;
    const user = users[username];
    if (!user) return res.status(404).json({ valid: false, message: 'User not found' });

    const isValid = authenticator.check(token, user.secret);
    res.json({ valid: isValid });

}


/*
    const { username } = req.body;
    const secret = authenticator.generateSecret();
    users[username] = { secret };
 
    const otpauth = authenticator.keyuri(username, 'MyApp', secret);
    console.log(otpauth);
    const qr = await qrcode.toDataURL(otpauth);
 
    res.json({ secret, qr });*/


