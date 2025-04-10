const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * CredentialManager class for securely storing and retrieving user credentials
 * for job application portals
 */
class CredentialManager {
  /**
   * Initialize the credential manager
   * @param {string} encryptionKey - Key used for encrypting/decrypting credentials
   */
  constructor(encryptionKey) {
    this.encryptionKey = encryptionKey || process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!this.encryptionKey) {
      throw new Error('Encryption key is required for credential management');
    }
    
    // Validate encryption key length (must be 32 bytes for AES-256)
    if (Buffer.from(this.encryptionKey, 'hex').length !== 32) {
      throw new Error('Encryption key must be 64 hex characters (32 bytes)');
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @returns {string} - Encrypted data
   */
  encrypt(data) {
    if (!data) return null;
    
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher using AES-256-CBC
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV and encrypted data as a single string
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Data to decrypt
   * @returns {string} - Decrypted data
   */
  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
      // Split the encrypted data to get IV and actual encrypted content
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store credentials for a user and portal
   * @param {string} userId - User ID
   * @param {string} portal - Portal name (e.g., 'linkedin', 'indeed')
   * @param {Object} credentials - Credentials to store
   * @returns {Promise<Object>} - Stored credential document
   */
  async storeCredentials(userId, portal, credentials) {
    try {
      // Get the Credential model
      const Credential = mongoose.model('Credential');
      
      // Encrypt sensitive fields
      const encryptedCredentials = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'string') {
          encryptedCredentials[key] = this.encrypt(value);
        } else {
          encryptedCredentials[key] = value;
        }
      }
      
      // Check if credentials already exist for this user and portal
      let credential = await Credential.findOne({ user: userId, portal });
      
      if (credential) {
        // Update existing credentials
        credential.credentials = encryptedCredentials;
        credential.updatedAt = new Date();
        await credential.save();
      } else {
        // Create new credentials
        credential = await Credential.create({
          user: userId,
          portal,
          credentials: encryptedCredentials
        });
      }
      
      return credential;
    } catch (error) {
      console.error('Error storing credentials:', error);
      throw new Error(`Failed to store credentials for ${portal}`);
    }
  }

  /**
   * Retrieve credentials for a user and portal
   * @param {string} userId - User ID
   * @param {string} portal - Portal name (e.g., 'linkedin', 'indeed')
   * @returns {Promise<Object>} - Decrypted credentials
   */
  async getCredentials(userId, portal) {
    try {
      // Get the Credential model
      const Credential = mongoose.model('Credential');
      
      // Find credentials for this user and portal
      const credential = await Credential.findOne({ user: userId, portal });
      
      if (!credential) {
        return null;
      }
      
      // Decrypt sensitive fields
      const decryptedCredentials = {};
      for (const [key, value] of Object.entries(credential.credentials)) {
        if (typeof value === 'string' && value.includes(':')) {
          decryptedCredentials[key] = this.decrypt(value);
        } else {
          decryptedCredentials[key] = value;
        }
      }
      
      return decryptedCredentials;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      throw new Error(`Failed to retrieve credentials for ${portal}`);
    }
  }

  /**
   * Delete credentials for a user and portal
   * @param {string} userId - User ID
   * @param {string} portal - Portal name (e.g., 'linkedin', 'indeed')
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deleteCredentials(userId, portal) {
    try {
      // Get the Credential model
      const Credential = mongoose.model('Credential');
      
      // Delete credentials for this user and portal
      const result = await Credential.deleteOne({ user: userId, portal });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting credentials:', error);
      throw new Error(`Failed to delete credentials for ${portal}`);
    }
  }

  /**
   * List all portals for which a user has stored credentials
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of portal names
   */
  async listUserPortals(userId) {
    try {
      // Get the Credential model
      const Credential = mongoose.model('Credential');
      
      // Find all credentials for this user
      const credentials = await Credential.find({ user: userId });
      
      // Extract portal names
      return credentials.map(cred => cred.portal);
    } catch (error) {
      console.error('Error listing user portals:', error);
      throw new Error('Failed to list user portals');
    }
  }

  /**
   * Check if a user has credentials for a specific portal
   * @param {string} userId - User ID
   * @param {string} portal - Portal name (e.g., 'linkedin', 'indeed')
   * @returns {Promise<boolean>} - True if credentials exist, false otherwise
   */
  async hasCredentials(userId, portal) {
    try {
      // Get the Credential model
      const Credential = mongoose.model('Credential');
      
      // Check if credentials exist for this user and portal
      const count = await Credential.countDocuments({ user: userId, portal });
      
      return count > 0;
    } catch (error) {
      console.error('Error checking credentials:', error);
      throw new Error(`Failed to check credentials for ${portal}`);
    }
  }
}

module.exports = CredentialManager;
