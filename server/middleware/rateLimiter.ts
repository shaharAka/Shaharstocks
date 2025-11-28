import rateLimit from 'express-rate-limit';

// Aggressive rate limiting for signup to prevent automated abuse
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 signup attempts per windowMs
  message: 'Too many signup attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  handler: (req, res) => {
    console.log(`[RateLimit] Signup rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many signup attempts. Please try again later.',
      retryAfter: Math.ceil(15 * 60 / 60) + ' minutes'
    });
  },
});

// Moderate rate limiting for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    console.log(`[RateLimit] Login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: Math.ceil(15 * 60 / 60) + ' minutes'
    });
  },
});

// Rate limiting for email verification resend
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 resend attempts per hour
  message: 'Too many verification email requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RateLimit] Resend verification rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many verification email requests. Please try again later.',
      retryAfter: '1 hour'
    });
  },
});
