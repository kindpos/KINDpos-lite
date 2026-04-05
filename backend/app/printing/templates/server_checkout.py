"""
KINDpos Server Checkout Template — Thermal Print Spec v1.0

The end-of-shift receipt a manager uses to cash out a server.
Designed to be verifiable in under 60 seconds without touching the POS.

Sections (top to bottom):
  1. Header         — Restaurant, server name, shift times
  2. Sales Summary  — Gross, voids/comps (aggregate), net, tax
  3. CC Detail      — Individual credit card transactions
  4. Tip Summary    — CC tips, declared cash tips, gross tips
  5. Tip Out        — Role-based deductions (or pool reference)
  6. Cash Recon     — THE number: CASH DUE (double-width)
  7. Open Tip Warn  — Flags unadjusted tips
  8. Signatures     — Server + manager sign-off
"""

from typing import List, Dict, Any
from .base_template import BaseTemplate


class ServerCheckoutTemplate(BaseTemplate):

    def render(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        commands = super().render(context)

        commands.extend(self._render_header(context))
        commands.extend(self._render_sales_summary(context))
        commands.extend(self._render_cc_detail(context))
        commands.extend(self._render_tip_summary(context))
        commands.extend(self._render_tip_out(context))
        commands.extend(self._render_cash_reconciliation(context))
        commands.extend(self._render_open_tip_warning(context))
        commands.extend(self._render_signatures(context))

        commands.append({'type': 'feed', 'lines': 5})
        commands.append({'type': 'cut', 'partial': False})
        return commands

    # ------------------------------------------------------------------
    # 1. Header
    # ------------------------------------------------------------------

    def _render_header(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []

        cmds.append({'type': 'text', 'content': ctx.get('restaurant_name', 'KINDpos'), 'bold': True, 'align': 'center', 'double_width': True, 'double_height': True})
        cmds.append({'type': 'text', 'content': 'SERVER CHECKOUT', 'bold': True, 'align': 'center', 'double_width': True, 'double_height': True})
        cmds.append({'type': 'feed', 'lines': 1})

        server_name = ctx.get('server_name', 'N/A')
        cmds.append({'type': 'text', 'content': f"Server: {server_name}", 'bold': True})

        date = ctx.get('date', 'N/A')
        cmds.append({'type': 'text', 'content': f"Date: {date}"})

        clock_in = self._format_time(ctx.get('clock_in'))
        clock_out = self._format_time(ctx.get('clock_out'))

        if clock_out and clock_out != 'N/A':
            cmds.append({'type': 'text', 'content': f"Shift: {clock_in} - {clock_out}"})
            duration = ctx.get('shift_duration', '')
            if duration:
                cmds.append({'type': 'text', 'content': f"Duration: {duration}"})
        else:
            cmds.append({'type': 'text', 'content': f"Clock In: {clock_in}"})
            cmds.append({'type': 'text', 'content': '*** SERVER NOT CLOCKED OUT ***', 'bold': True, 'align': 'center'})

        cmds.append({'type': 'divider', 'char': '='})
        return cmds

    # ------------------------------------------------------------------
    # 2. Sales Summary
    # ------------------------------------------------------------------

    def _render_sales_summary(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        cpl = self.chars_per_line

        cmds.append({'type': 'text', 'content': '  SALES SUMMARY  ', 'bold': True, 'reverse': True, 'align': 'center', 'double_height': True})

        checks_closed = ctx.get('checks_closed', 0)
        cmds.append({'type': 'text', 'content': f"Checks Closed: {checks_closed}"})

        gross_sales = ctx.get('gross_sales', 0.0)
        cmds.append({'type': 'text', 'content': self._money_line('Gross Sales', gross_sales, cpl)})

        voids_total = ctx.get('voids_total', 0.0)
        if voids_total > 0:
            cmds.append({'type': 'text', 'content': self._money_line('Voids', -voids_total, cpl)})

        comps_total = ctx.get('comps_total', 0.0)
        if comps_total > 0:
            cmds.append({'type': 'text', 'content': self._money_line('Comps', -comps_total, cpl)})

        discounts_total = ctx.get('discounts_total', 0.0)
        if discounts_total > 0:
            cmds.append({'type': 'text', 'content': self._money_line('Discounts', -discounts_total, cpl)})

        net_sales = ctx.get('net_sales', 0.0)
        cmds.append({'type': 'divider'})
        cmds.append({'type': 'text', 'content': self._money_line('Net Sales', net_sales, cpl), 'bold': True, 'double_width': True, 'double_height': True})

        tax_collected = ctx.get('tax_collected', 0.0)
        cmds.append({'type': 'text', 'content': self._money_line('Tax Collected', tax_collected, cpl)})

        # Payment method breakdown
        cash_sales = ctx.get('cash_sales', 0.0)
        card_sales = ctx.get('card_sales', 0.0)
        cmds.append({'type': 'feed', 'lines': 1})
        cmds.append({'type': 'text', 'content': self._money_line('Cash Sales', cash_sales, cpl)})
        cmds.append({'type': 'text', 'content': self._money_line('Card Sales', card_sales, cpl)})

        cmds.append({'type': 'divider', 'char': '='})
        return cmds

    # ------------------------------------------------------------------
    # 3. CC Detail
    # ------------------------------------------------------------------

    def _render_cc_detail(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        cpl = self.chars_per_line
        show_detail = ctx.get('show_cc_detail', True)
        cc_transactions = ctx.get('cc_transactions', [])

        cmds.append({'type': 'text', 'content': '  CC DETAIL  ', 'bold': True, 'reverse': True, 'align': 'center', 'double_height': True})

        if not cc_transactions:
            cmds.append({'type': 'text', 'content': 'No credit card transactions this shift.', 'align': 'center'})
            cmds.append({'type': 'divider', 'char': '='})
            return cmds

        if show_detail:
            # Column header
            hdr = f"{'Chk':<6}{'Last4':<7}{'Total':>10}{'Tip':>10}"
            cmds.append({'type': 'text', 'content': hdr[:cpl], 'bold': True})
            cmds.append({'type': 'divider'})

            for txn in cc_transactions:
                check = str(txn.get('check_number', ''))[:5]
                last4 = str(txn.get('card_last_four', '****'))
                total = txn.get('total', 0.0)
                tip = txn.get('tip', 0.0)
                line = f"{check:<6}{last4:<7}${total:>8.2f}${tip:>8.2f}"
                cmds.append({'type': 'text', 'content': line[:cpl]})

                # Flag open (unadjusted) tips
                if txn.get('tip_open', False):
                    cmds.append({'type': 'text', 'content': '      ^ OPEN TIP', 'bold': True})
        else:
            # Summary only
            cc_count = len(cc_transactions)
            cc_total = sum(t.get('total', 0.0) for t in cc_transactions)
            cc_tips = sum(t.get('tip', 0.0) for t in cc_transactions)
            cmds.append({'type': 'text', 'content': f"CC Transactions: {cc_count}"})
            cmds.append({'type': 'text', 'content': self._money_line('CC Sales Total', cc_total, cpl)})
            cmds.append({'type': 'text', 'content': self._money_line('CC Tips Total', cc_tips, cpl)})

        cmds.append({'type': 'divider', 'char': '='})
        return cmds

    # ------------------------------------------------------------------
    # 4. Tip Summary
    # ------------------------------------------------------------------

    def _render_tip_summary(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        cpl = self.chars_per_line

        cmds.append({'type': 'text', 'content': '  TIP SUMMARY  ', 'bold': True, 'reverse': True, 'align': 'center', 'double_height': True})

        cc_tips = ctx.get('cc_tips_total', 0.0)
        declared_cash_tips = ctx.get('declared_cash_tips')

        cmds.append({'type': 'text', 'content': self._money_line('Credit Card Tips', cc_tips, cpl), 'bold': True, 'double_height': True})

        if declared_cash_tips is None:
            cmds.append({'type': 'text', 'content': f"{'Declared Cash Tips:':<{cpl-12}} NOT DECLARED", 'bold': True})
        else:
            cmds.append({'type': 'text', 'content': self._money_line('Declared Cash Tips', declared_cash_tips, cpl)})

        cmds.append({'type': 'divider'})

        gross_tips = ctx.get('gross_tips', 0.0)
        cmds.append({'type': 'text', 'content': self._money_line('Gross Tips', gross_tips, cpl), 'bold': True, 'double_width': True, 'double_height': True})

        cmds.append({'type': 'divider', 'char': '='})
        return cmds

    # ------------------------------------------------------------------
    # 5. Tip Out (two variants: individual or pool)
    # ------------------------------------------------------------------

    def _render_tip_out(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        cpl = self.chars_per_line
        tip_pool = ctx.get('tip_pool')

        if tip_pool:
            return self._render_tip_out_pool(ctx)

        cmds.append({'type': 'text', 'content': '  TIP OUT  ', 'bold': True, 'reverse': True, 'align': 'center', 'double_height': True})

        tip_outs = ctx.get('tip_outs', [])
        for to in tip_outs:
            role = to.get('role', '')
            basis_desc = to.get('basis_description', '')
            amount = to.get('amount', 0.0)
            adjusted = to.get('adjusted', False)
            not_staffed = to.get('not_staffed', False)

            label = f"{role} ({basis_desc})" if basis_desc else role

            suffix = ''
            if not_staffed:
                suffix = '  *N/S'
            elif adjusted:
                suffix = '  *ADJ'

            line = self._money_line(label, amount, cpl - len(suffix))
            cmds.append({'type': 'text', 'content': line + suffix})

        total_tip_out = ctx.get('total_tip_out', 0.0)
        cmds.append({'type': 'divider'})
        cmds.append({'type': 'text', 'content': self._money_line('Total Tip Out', total_tip_out, cpl), 'bold': True, 'double_height': True})

        net_tips = ctx.get('net_tips', 0.0)
        cmds.append({'type': 'text', 'content': self._money_line('Net Tips', net_tips, cpl), 'bold': True, 'double_width': True, 'double_height': True})

        cmds.append({'type': 'divider', 'char': '='})
        return cmds

    def _render_tip_out_pool(self, ctx: Dict) -> List[Dict]:
        """Variant for servers in a tip pool (e.g., bar pool)."""
        cmds: List[Dict] = []
        cpl = self.chars_per_line
        tip_pool = ctx.get('tip_pool', {})
        pool_name = tip_pool.get('name', 'TIP POOL')

        cmds.append({'type': 'text', 'content': f"  TIP POOL: {pool_name}  ", 'bold': True, 'reverse': True, 'align': 'center'})

        tips_collected = tip_pool.get('tips_collected', 0.0)
        cmds.append({'type': 'text', 'content': self._money_line('Your tips collected', tips_collected, cpl)})
        cmds.append({'type': 'text', 'content': 'Pool settles at Close Day', 'align': 'center'})
        cmds.append({'type': 'feed', 'lines': 1})

        # Individual tip-outs the pooled server still owes
        tip_outs = ctx.get('tip_outs', [])
        if tip_outs:
            cmds.append({'type': 'text', 'content': 'Tip-outs from your checks:', 'bold': True})
            for to in tip_outs:
                role = to.get('role', '')
                basis_desc = to.get('basis_description', '')
                amount = to.get('amount', 0.0)
                label = f"{role} ({basis_desc})" if basis_desc else role
                cmds.append({'type': 'text', 'content': self._money_line(label, amount, cpl)})

            total_tip_out = ctx.get('total_tip_out', 0.0)
            cmds.append({'type': 'divider'})
            cmds.append({'type': 'text', 'content': self._money_line('Total Tip Out', total_tip_out, cpl), 'bold': True})

        cmds.append({'type': 'divider', 'char': '='})
        return cmds

    # ------------------------------------------------------------------
    # 6. Cash Reconciliation — the most important block
    # ------------------------------------------------------------------

    def _render_cash_reconciliation(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        cpl = self.chars_per_line
        tip_pool = ctx.get('tip_pool')
        cc_tips_payout = ctx.get('cc_tips_payout', 'cash')  # 'cash' | 'payroll'

        cmds.append({'type': 'text', 'content': '  CASH RECONCILIATION  ', 'bold': True, 'reverse': True, 'align': 'center', 'double_height': True})

        cash_collected = ctx.get('cash_collected', 0.0)
        declared_cash_tips = ctx.get('declared_cash_tips', 0.0) or 0.0
        cc_tips_total = ctx.get('cc_tips_total', 0.0)
        total_tip_out = ctx.get('total_tip_out', 0.0)

        cmds.append({'type': 'text', 'content': self._money_line('Cash Collected', cash_collected, cpl)})
        cmds.append({'type': 'text', 'content': self._money_line('Declared Cash Tips', -declared_cash_tips, cpl)})

        # CC tips owed only if paid in cash AND not in a pool
        if cc_tips_payout == 'cash' and not tip_pool:
            cmds.append({'type': 'text', 'content': self._money_line('CC Tips Owed to Server', cc_tips_total, cpl)})

        cmds.append({'type': 'text', 'content': self._money_line('Tip Out Paid', -total_tip_out, cpl)})

        # Calculate cash due
        cash_due = cash_collected - declared_cash_tips + total_tip_out
        if cc_tips_payout == 'cash' and not tip_pool:
            cash_due -= cc_tips_total

        cmds.append({'type': 'feed', 'lines': 1})
        cmds.append({'type': 'divider', 'char': '='})

        # THE number — double width
        if cash_due > 0.005:
            label = 'CASH DUE TO HOUSE'
            amount_str = f"${cash_due:.2f}"
        elif cash_due < -0.005:
            label = 'DUE TO SERVER'
            amount_str = f"${abs(cash_due):.2f}"
        else:
            label = 'SETTLED'
            amount_str = 'NO CASH DUE'

        cmds.append({
            'type': 'text',
            'content': f"{label}: {amount_str}",
            'bold': True, 'double_width': True, 'double_height': True, 'align': 'center',
        })

        cmds.append({'type': 'divider', 'char': '='})

        # Pool member note
        if tip_pool:
            cmds.append({'type': 'feed', 'lines': 1})
            cmds.append({'type': 'text', 'content': 'CC tips settle with pool at', 'align': 'center'})
            cmds.append({'type': 'text', 'content': 'Close Day. Share based on hours.', 'align': 'center'})
            cmds.append({'type': 'feed', 'lines': 1})

        return cmds

    # ------------------------------------------------------------------
    # 7. Open Tip Warning
    # ------------------------------------------------------------------

    def _render_open_tip_warning(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        open_tip_count = ctx.get('open_tip_count', 0)

        if open_tip_count > 0:
            cmds.append({'type': 'feed', 'lines': 1})
            noun = 'TIP' if open_tip_count == 1 else 'TIPS'
            cmds.append({
                'type': 'text',
                'content': f"*** {open_tip_count} OPEN {noun} — ADJUST BEFORE CLOSE ***",
                'bold': True, 'align': 'center',
            })
            cmds.append({'type': 'feed', 'lines': 1})

        return cmds

    # ------------------------------------------------------------------
    # 8. Signatures
    # ------------------------------------------------------------------

    def _render_signatures(self, ctx: Dict) -> List[Dict]:
        cmds: List[Dict] = []
        cpl = self.chars_per_line
        require_manager_sign = ctx.get('require_manager_sign', True)

        cmds.append({'type': 'feed', 'lines': 2})
        cmds.append({'type': 'text', 'content': f"{'Server:':<{cpl - 20}} _________________"})
        cmds.append({'type': 'feed', 'lines': 1})

        if require_manager_sign:
            cmds.append({'type': 'text', 'content': f"{'Manager:':<{cpl - 20}} _________________"})
            cmds.append({'type': 'feed', 'lines': 1})

        return cmds

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _money_line(self, label: str, amount: float, width: int) -> str:
        """Format a label + dollar amount right-aligned to fill the line width."""
        if amount < 0:
            money = f"-${abs(amount):.2f}"
        else:
            money = f"${amount:.2f}"
        padding = width - len(label) - len(money) - 1
        if padding < 1:
            padding = 1
        return f"{label}{' ' * padding}{money}"