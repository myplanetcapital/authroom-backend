const express = require('express');
const ProtectedRoutes = express.Router();
const Exchange = require('../vendor/Exchange');
const AuthController = require('../controllers/AuthController');
const QrcodeController = require('../controllers/QrcodeController');
//const Auth = require('../vendor/Auth');

module.exports=function(app){

	app.use(function(req, res, next){
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,X-Auth-Token");
		res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		next();
	});
	
	app.use('/api',function(req,res,next){
		console.log(req.url);
		console.log(req.body);
		next();
	});
	app.use('/api',ProtectedRoutes);
	//app.use('/api',Exchange.Validations.isAuthenticatedTraders);

	app.post('/api/auth/signIn',AuthController.signIn);
	app.post('/api/auth/2fa/qr', QrcodeController.generateQRCode);
	app.post('/api/auth/2fa/verify', QrcodeController.verifyCode);
	app.post('/api/auth/2fa/saveData', QrcodeController.saveData);
	//app.post('/api/auth/2fa/enable', QrcodeController.verifyCode);
	//app.post('/api/auth/2fa/disable', QrcodeController.verifyCode);
	//app.post('/api/auth/2fa/status', QrcodeController.verifyCode);
	
	
	
	
};
