from odoo import models, fields, api

class ResCompany(models.Model):
    _inherit = "res.company"

    l10n_nl_reports_sbr_password = fields.Char('Certificate or private key password', groups="account.group_account_user")

    @api.constrains('l10n_nl_reports_sbr_password', 'l10n_nl_reports_sbr_cert', 'l10n_nl_reports_sbr_key')
    def _check_l10n_nl_password(self):
        for company in self:
            password = company.l10n_nl_reports_sbr_password
            if password:
                self._l10n_nl_get_certificate_and_key_bytes(bytes(password, 'utf-8'))
