const logger = require('../../utils/logger');

const sendEmail = async (mailOptions) => {
    logger.info(`Mock email sent to: ${mailOptions.to} with subject: ${mailOptions.subject}`);
    return Promise.resolve({ messageId: 'mock-message-id' });
};

module.exports = {
    sendEmail
};
