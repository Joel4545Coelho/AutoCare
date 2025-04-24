const User = require("../models/user")
const { parse } = require("cookie")
var jwt = require("jsonwebtoken")
const jwtkey = "zzzzzzzzzz"

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
            console.log("Conteúdo de res.locals.user:", res.locals.user);
        }
        next()
    }catch(err){
        
    }
}

module.exports = verifyToken;