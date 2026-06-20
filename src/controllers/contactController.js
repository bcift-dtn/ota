const { sendContactEmail } = require('../config/mailer');

exports.renderContactPage = (req, res) => {
    res.render('pages/contact');
};

exports.sendMessage = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !phone || !subject || !message ) {
            return res.status(400).json({ error: 'All fields are required. '});
        } 

        await sendContactEmail({ name, email, phone, subject, message });

        res.json({ success: 'Message sent successfully!' });
    } catch (err) {
        console.error('Contact email send error:', err);
        res.status(500).json({ err: 'Failed to send message.' });
    }
};