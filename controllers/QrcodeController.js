const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const sharp = require("sharp");
const path = require("path");
const Providers = require("../models/Providers");
const OtpAuth = require("../models/OtpAuth");
const { QRCodeStyling } = require('qr-code-styling/lib/qr-code-styling.common.js');
const nodeCanvas = require('canvas');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const { Validator } = require('node-input-validator');


function decodeOtpauth(otpauth) {
    const url = new URL(otpauth);

    const type = url.hostname; // totp or hotp

    // Decode label
    const label = decodeURIComponent(url.pathname.slice(1));
    const [issuerFromLabel, accountName] = label.includes(":")
        ? label.split(":")
        : [null, label];

    const params = Object.fromEntries(url.searchParams.entries());

    return {
        type,
        accountName,
        issuer: params.issuer || issuerFromLabel,
        secret: params.secret,
        digits: params.digits || 6,
        period: params.period || 30,
        algorithm: params.algorithm || "SHA1"
    };
}




exports.generateQRCode = async (req, res) => {

    const fieldsValidation = new Validator(req.body, {
        providerId: 'required|string',
        userName: 'required|string',
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
    let reqUserName = req.body.userName;

    let providerData = await Providers.findOne({ providerId: reqProviderId });

    if (!providerData) {
        return res.status(422).json({
            'meta': {
                'message': "Provider does not exist",
                'status_code': 422,
                'status': false,
            }
        });
    }

    let providerAppName = providerData.appName;
    let providerLogo = providerData.logo;

    let logoBuffer;

    if (providerLogo.startsWith("data:image/svg+xml")) {
        // Base64 SVG
        const base64Data = providerLogo.replace(/^data:image\/svg\+xml;base64,/, "");
        const svgBuffer = Buffer.from(base64Data, "base64");

        logoBuffer = await sharp(svgBuffer)
            .resize(200, 200)
            .png()
            .toBuffer();

    } else if (providerLogo.startsWith("http")) {
        const axios = require("axios");
        const response = await axios.get(providerLogo, {
            responseType: "arraybuffer"
        });

        logoBuffer = await sharp(response.data)
            .resize(200, 200)
            .png()
            .toBuffer();

    } else {
        const fs = require("fs");
        const fileBuffer = fs.readFileSync(providerLogo);

        logoBuffer = await sharp(fileBuffer)
            .resize(200, 200)
            .png()
            .toBuffer();
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(reqUserName, providerAppName, secret);

    const options = {
        width: 300,
        height: 300,
        shape: "square",
        data: otpauth,
        image: logoBuffer,
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

    const base64Image = finalBuffer.toString("base64");

    const base64WithPrefix = `data:image/png;base64,${base64Image}`;

    return res.status(200).json({
         data: {
            qrImage: base64WithPrefix,
            otpauth: otpauth
        },
        meta: {
            message: "QR generated successfully",
            status_code: 200,
            status: true,
        }
       
    });

    /*
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.send(finalBuffer);*/



};

exports.verifyCode = async (req, res) => {

    let reqSecret = req.body.secret;
    let code = req.body.code;

    const isValid = authenticator.check(code, reqSecret);

    return res.status(200).json({
        "isValid": isValid,
        'meta': {
            'message': "verify",
            'status_code': 200,
            'status': true,
        }
    });


}

exports.saveData = async (req, res) => {

    const fieldsValidation = new Validator(req.body, {
        qrData: 'required|string',
        userId: 'required|sometimes|string',
        deviceId: 'required|sometimes|string'
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

    let reqQrData = req.body.qrData;
    let reqUserId = req.body.userId;
    let reqDeviceId = req.body.deviceId;

    try {

        const decodedAuth = decodeOtpauth(reqQrData);

        let secret = decodedAuth.secret;
        let userName = decodedAuth.accountName;
        let issuer = decodedAuth.issuer;

        await OtpAuth.create([{
            qrUrl: reqQrData,
            userId: reqUserId,
            deviceId: reqDeviceId,
            secret: secret,
            userName: userName,
            issuer: issuer,
            qrObj: decodedAuth
        }])


        return res.status(200).json({
            'meta': {
                'message': "Auth Data Save",
                'status_code': 200,
                'status': true,
            }
        });
    } catch (ex) {

        console.log(ex);
        return res.status(422).json({
            'meta': {
                'message': ex.message,
                'status_code': 422,
                'status': false,
            }
        });

    }


}


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



/*
    const { username } = req.body;
    const secret = authenticator.generateSecret();
    users[username] = { secret };
 
    const otpauth = authenticator.keyuri(username, 'MyApp', secret);
    console.log(otpauth);
    const qr = await qrcode.toDataURL(otpauth);
 
    res.json({ secret, qr });*/


