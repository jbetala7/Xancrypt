// File: config/passport.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${process.env.SERVER_URL}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      // Find existing user by Google ID or email
      let user = await User.findOne({
        $or: [
          { 'oauth.googleId': profile.id },
          email ? { email } : null
        ].filter(Boolean)
      });
      if (user) {
        // If found by email but missing googleId, attach it
        if (email && user.email === email && !user.oauth?.googleId) {
          user.oauth = user.oauth || {};
          user.oauth.googleId = profile.id;
          user.active = true;
          await user.save();
        }
      } else {
        // Create new user
        user = await User.create({
          email,
          active: true,
          oauth: { googleId: profile.id }
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy(
  {
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:  `${process.env.SERVER_URL}/api/auth/github/callback`,
    scope:        ['user:email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      // Find existing user by GitHub ID or email
      let user = await User.findOne({
        $or: [
          { 'oauth.githubId': profile.id },
          email ? { email } : null
        ].filter(Boolean)
      });
      if (user) {
        // Attach GitHub ID if missing
        if (email && user.email === email && !user.oauth?.githubId) {
          user.oauth = user.oauth || {};
          user.oauth.githubId = profile.id;
          user.active = true;
          await user.save();
        }
      } else {
        // Create new user if none found
        user = await User.create({
          email,
          active: true,
          oauth: { githubId: profile.id }
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;
