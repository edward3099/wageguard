/**
 * Client Management Controller
 * 
 * Handles client management for payroll bureaus with multi-tenant isolation
 */

const { pool } = require('../config/database');

class ClientController {
  /**
   * Create a new client for a bureau
   * POST /api/clients
   */
  async createClient(req, res) {
    try {
      const { name, industry, settings = {} } = req.body;
      const bureauId = req.user.bureauId;

      if (!req.user.isBureau) {
        return res.status(403).json({
          success: false,
          error: 'Only bureaus can create clients'
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Client name is required'
        });
      }

      // Check if client name already exists for this bureau
      const existingClient = await pool.query(
        'SELECT id FROM clients WHERE bureau_id = $1 AND LOWER(name) = LOWER($2)',
        [bureauId, name]
      );

      if (existingClient.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Client with this name already exists in your bureau'
        });
      }

      // Create client
      const clientResult = await pool.query(
        `INSERT INTO clients (bureau_id, name, industry, settings) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name, industry, settings, created_at`,
        [bureauId, name, industry, settings]
      );

      const client = clientResult.rows[0];

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        client
      });

    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while creating client'
      });
    }
  }

  /**
   * Get all clients for a bureau
   * GET /api/clients
   */
  async getClients(req, res) {
    try {
      const bureauId = req.user.bureauId;

      if (!req.user.isBureau) {
        return res.status(403).json({
          success: false,
          error: 'Only bureaus can access client list'
        });
      }

      const clientsResult = await pool.query(
        `SELECT c.*, 
                COUNT(DISTINCT cu.id) as upload_count,
                COUNT(DISTINCT w.id) as worker_count,
                MAX(cu.created_at) as last_upload
         FROM clients c
         LEFT JOIN csv_uploads cu ON c.id = cu.client_id
         LEFT JOIN workers w ON cu.id = w.csv_upload_id
         WHERE c.bureau_id = $1
         GROUP BY c.id
         ORDER BY c.name`,
        [bureauId]
      );

      res.json({
        success: true,
        clients: clientsResult.rows
      });

    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching clients'
      });
    }
  }

  /**
   * Get a specific client by ID
   * GET /api/clients/:clientId
   */
  async getClient(req, res) {
    try {
      const { clientId } = req.params;
      const bureauId = req.user.bureauId;

      if (!req.user.isBureau) {
        return res.status(403).json({
          success: false,
          error: 'Only bureaus can access client details'
        });
      }

      const clientResult = await pool.query(
        `SELECT c.*, 
                COUNT(DISTINCT cu.id) as total_uploads,
                COUNT(DISTINCT w.id) as total_workers,
                SUM(CASE WHEN cc.rag_status = 'RED' THEN 1 ELSE 0 END) as red_compliance_count,
                SUM(CASE WHEN cc.rag_status = 'AMBER' THEN 1 ELSE 0 END) as amber_compliance_count,
                SUM(CASE WHEN cc.rag_status = 'GREEN' THEN 1 ELSE 0 END) as green_compliance_count
         FROM clients c
         LEFT JOIN csv_uploads cu ON c.id = cu.client_id
         LEFT JOIN workers w ON cu.id = w.csv_upload_id
         LEFT JOIN compliance_checks cc ON cu.id = cc.csv_upload_id
         WHERE c.id = $1 AND c.bureau_id = $2
         GROUP BY c.id`,
        [clientId, bureauId]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      const client = clientResult.rows[0];

      // Get recent uploads for this client
      const uploadsResult = await pool.query(
        `SELECT cu.*, 
                COUNT(w.id) as worker_count,
                COUNT(cc.id) as compliance_check_count
         FROM csv_uploads cu
         LEFT JOIN workers w ON cu.id = w.csv_upload_id
         LEFT JOIN compliance_checks cc ON cu.id = cc.csv_upload_id
         WHERE cu.client_id = $1
         GROUP BY cu.id
         ORDER BY cu.created_at DESC
         LIMIT 10`,
        [clientId]
      );

      res.json({
        success: true,
        client: {
          ...client,
          recentUploads: uploadsResult.rows
        }
      });

    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching client'
      });
    }
  }

  /**
   * Update a client
   * PUT /api/clients/:clientId
   */
  async updateClient(req, res) {
    try {
      const { clientId } = req.params;
      const { name, industry, settings } = req.body;
      const bureauId = req.user.bureauId;

      if (!req.user.isBureau) {
        return res.status(403).json({
          success: false,
          error: 'Only bureaus can update clients'
        });
      }

      // Check if client exists and belongs to this bureau
      const existingClient = await pool.query(
        'SELECT id FROM clients WHERE id = $1 AND bureau_id = $2',
        [clientId, bureauId]
      );

      if (existingClient.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      // Check if new name conflicts with existing clients
      if (name) {
        const nameConflict = await pool.query(
          'SELECT id FROM clients WHERE bureau_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
          [bureauId, name, clientId]
        );

        if (nameConflict.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Client with this name already exists in your bureau'
          });
        }
      }

      // Update client
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(name);
      }

      if (industry !== undefined) {
        updateFields.push(`industry = $${paramCount++}`);
        updateValues.push(industry);
      }

      if (settings !== undefined) {
        updateFields.push(`settings = $${paramCount++}`);
        updateValues.push(settings);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      updateValues.push(clientId);
      const updateQuery = `
        UPDATE clients 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND bureau_id = $${paramCount + 1}
        RETURNING id, name, industry, settings, created_at
      `;
      updateValues.push(bureauId);

      const updateResult = await pool.query(updateQuery, updateValues);

      res.json({
        success: true,
        message: 'Client updated successfully',
        client: updateResult.rows[0]
      });

    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while updating client'
      });
    }
  }

  /**
   * Delete a client (soft delete - mark as inactive)
   * DELETE /api/clients/:clientId
   */
  async deleteClient(req, res) {
    try {
      const { clientId } = req.params;
      const bureauId = req.user.bureauId;

      if (!req.user.isBureau) {
        return res.status(403).json({
          success: false,
          error: 'Only bureaus can delete clients'
        });
      }

      // Check if client exists and belongs to this bureau
      const existingClient = await pool.query(
        'SELECT id FROM clients WHERE id = $1 AND bureau_id = $2',
        [clientId, bureauId]
      );

      if (existingClient.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      // Check if client has any data (uploads, workers, etc.)
      const hasData = await pool.query(
        `SELECT COUNT(*) as count FROM csv_uploads WHERE client_id = $1`,
        [clientId]
      );

      if (parseInt(hasData.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete client with existing data. Please archive instead.'
        });
      }

      // Delete client
      await pool.query(
        'DELETE FROM clients WHERE id = $1 AND bureau_id = $2',
        [clientId, bureauId]
      );

      res.json({
        success: true,
        message: 'Client deleted successfully'
      });

    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while deleting client'
      });
    }
  }

  /**
   * Get client compliance summary
   * GET /api/clients/:clientId/compliance-summary
   */
  async getClientComplianceSummary(req, res) {
    try {
      const { clientId } = req.params;
      const bureauId = req.user.bureauId;

      if (!req.user.isBureau) {
        return res.status(403).json({
          success: false,
          error: 'Only bureaus can access client compliance data'
        });
      }

      // Verify client belongs to this bureau
      const clientCheck = await pool.query(
        'SELECT id FROM clients WHERE id = $1 AND bureau_id = $2',
        [clientId, bureauId]
      );

      if (clientCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      // Get compliance summary
      const summaryResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT cu.id) as total_uploads,
          COUNT(DISTINCT w.id) as total_workers,
          COUNT(DISTINCT cc.id) as total_compliance_checks,
          SUM(CASE WHEN cc.rag_status = 'RED' THEN 1 ELSE 0 END) as red_count,
          SUM(CASE WHEN cc.rag_status = 'AMBER' THEN 1 ELSE 0 END) as amber_count,
          SUM(CASE WHEN cc.rag_status = 'GREEN' THEN 1 ELSE 0 END) as green_count,
          AVG(cc.compliance_score) as average_compliance_score,
          MAX(cu.created_at) as last_upload_date
         FROM clients c
         LEFT JOIN csv_uploads cu ON c.id = cu.client_id
         LEFT JOIN workers w ON cu.id = w.csv_upload_id
         LEFT JOIN compliance_checks cc ON cu.id = cc.csv_upload_id
         WHERE c.id = $1`,
        [clientId]
      );

      const summary = summaryResult.rows[0];

      // Get monthly compliance trends
      const trendsResult = await pool.query(
        `SELECT 
          DATE_TRUNC('month', cu.created_at) as month,
          COUNT(DISTINCT cu.id) as uploads,
          COUNT(DISTINCT w.id) as workers,
          AVG(cc.compliance_score) as avg_score
         FROM clients c
         LEFT JOIN csv_uploads cu ON c.id = cu.client_id
         LEFT JOIN workers w ON cu.id = w.csv_upload_id
         LEFT JOIN compliance_checks cc ON cu.id = cc.csv_upload_id
         WHERE c.id = $1
         GROUP BY DATE_TRUNC('month', cu.created_at)
         ORDER BY month DESC
         LIMIT 12`,
        [clientId]
      );

      res.json({
        success: true,
        summary,
        trends: trendsResult.rows
      });

    } catch (error) {
      console.error('Get compliance summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching compliance summary'
      });
    }
  }
}

module.exports = new ClientController();
