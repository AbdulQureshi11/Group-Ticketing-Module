export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: err.errors
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle express-validator errors
  if (err.errors && Array.isArray(err.errors)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: err.errors
    });
  }

  const code = err.status || err.statusCode || 500;
  let message;

  if (process.env.NODE_ENV === 'development') {
    message = err.message || "Internal Server Error";
  } else {
    // In production, sanitize sensitive error details
    if (code >= 500) {
      message = "Internal Server Error";
    } else {
      // For client errors, allow a sanitized message if it's short and safe
      message = err.message && err.message.length < 100 ? err.message : "Bad Request";
    }
  }

  res.status(code).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
