const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findOrCreateGoogleUser } = require('../models/userModel');

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const emailVerified = profile.emails[0].verified;

            if (!emailVerified) {
                return done(null, false, {message: 'Google email not verified'});
            }

            const user = await findOrCreateGoogleUser(
                profile.id,
                email,
                profile.displayName
            );

            return done(null, user)
        } catch (err) {
            return done(err, null)
        }
    }
));

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((user, done) => done(null, user));