const User = require("../models/user")
const { parse } = require("cookie")
var jwt = require("jsonwebtoken")
const jwtkey = "zzzzzzzzzz"

const blockAuthenticated = (req, res, next) => {
    if (req.cookies && req.cookies.auth) {
        return res.status(403).send("Acesso negado! Você já está autenticado.");
    }
    next();
};

const verifyToken = async (req, res, next) =>{
    const cookies = parse(req.headers.cookie || "")
    const token = cookies.auth
    if (!token){
        res.locals.user = null
        return next()
    } 
    try{
        const decoded = jwt.decode(token, jwtkey)
        const user = await User.findById(decoded.id)
        if(!user){
            res.locals.user = null
        }else{
            res.locals.user = user
        }
        next()
    }catch(err){
        
    }
}

module.exports = verifyToken;