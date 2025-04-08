const User = require('../models/user')
const Message = require("../models/message");

const getUsers = async (req, res) => {
    try {
        const currentUser = res.locals.user;
        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized: User not authenticated" });
        }

        const currentUserId = currentUser._id;
        const currentUsername = currentUser.username
        const userType = currentUser.type;

        const users_M = await User.find(
            { 
                type: "paciente", 
                medicos_associados: currentUserId
            }, 
            "username"
        );
        const users = await User.find(
            { 
                type: "medico", 
                pacientes_associados: currentUserId
            }, 
            "username"
        );

        res.status(200).json({ currentUserId, users,  users_M, currentUsername, userType});
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
};

const getUnreadMessages = async (req, res) => {
    const currentUser = res.locals.user;
        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized: User not authenticated" });
        }
    var user_id = res.locals.user._id

    const unreadMessages = await Message.find({
        receiverId: user_id,
        seen: false,
    }).select({ "senderId": 1});
    res.status(200).json({ unreadMessages: unreadMessages});
}
module.exports = { getUsers, getUnreadMessages }
