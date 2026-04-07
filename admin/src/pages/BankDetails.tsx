import React, { useState } from 'react'
import { FormControl, Input, InputLabel } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'
import * as BankDetailsService from '@/services/BankDetailsService'
import { strings } from '@/lang/bank-details-form'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'

const BankDetails = () => {
  const [bankDetails, setBankDetails] = useState<bookcarsTypes.BankDetails | null>(null)
  const [noMatch, setNoMatch] = useState(false)

  const onLoad = async () => {
    try {
      const _bankDetails = await BankDetailsService.getBankDetails()
      setBankDetails(_bankDetails)
      if (!_bankDetails?.showBankDetailsPage) {
        setNoMatch(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-3xl mx-auto py-8 px-4">

        {bankDetails && !noMatch && (
          <div className="bg-white rounded-xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-text mb-5">{strings.BANK_DETAILS}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormControl fullWidth margin="dense">
                <InputLabel>{strings.ACCOUNT_HOLDER}</InputLabel>
                <Input type="text" readOnly autoComplete="off" value={bankDetails.accountHolder} />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{strings.BANK_NAME}</InputLabel>
                <Input type="text" readOnly autoComplete="off" value={bankDetails.bankName} />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{strings.IBAN}</InputLabel>
                <Input type="text" readOnly autoComplete="off" value={bankDetails.iban} />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{strings.SWIFT_BIC}</InputLabel>
                <Input type="text" readOnly autoComplete="off" value={bankDetails.swiftBic} />
              </FormControl>
            </div>
          </div>
        )}
      </div>

      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default BankDetails
