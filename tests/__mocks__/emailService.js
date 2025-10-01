const logger = require('../../utils/logger');

const sendEmail = async (mailOptions) => {
    logger.info(`Mock email sent to: ${mailOptions.to} with subject: ${mailOptions.subject}`);
    // Simulate successful email sending without actually sending
    return Promise.resolve({ messageId: 'mock-message-id' });
};

module.exports = {
    sendEmail
};
