export const buildStatsFromCounts = (targetDate, counts, users) => {
  const resultToDeepCv = counts.result_viewed > 0 ? (counts.deep_dive_opened / counts.result_viewed) * 100 : 0;
  const deepToPremiumIntroCv = counts.deep_dive_opened > 0 ? (counts.premium_intro_viewed / counts.deep_dive_opened) * 100 : 0;
  const resultToNoteCv = counts.result_viewed > 0 ? (counts.note_click / counts.result_viewed) * 100 : 0;
  const noteToPurchaseSuccessCv = counts.note_click > 0 ? (counts.purchase_success / counts.note_click) * 100 : 0;
  const noteToPurchaseCv = counts.note_click > 0 ? (counts.purchase_completed / counts.note_click) * 100 : 0;
  const lpToDrawCv = counts.page_view_lp > 0 ? (counts.draw_completed / counts.page_view_lp) * 100 : 0;
  const drawToResultCv = counts.draw_completed > 0 ? (counts.result_viewed / counts.draw_completed) * 100 : 0;
  const resultToPremiumIntroCv =
    counts.result_viewed > 0 ? (counts.premium_intro_viewed / counts.result_viewed) * 100 : 0;
  const premiumIntroToCheckoutCv =
    counts.premium_intro_viewed > 0 ? (counts.premium_checkout_clicked / counts.premium_intro_viewed) * 100 : 0;
  const checkoutToPurchaseSuccessCv =
    counts.premium_checkout_clicked > 0 ? (counts.purchase_success / counts.premium_checkout_clicked) * 100 : 0;
  const checkoutToPurchaseCv =
    counts.premium_checkout_clicked > 0 ? (counts.purchase_completed / counts.premium_checkout_clicked) * 100 : 0;
  const purchaseSuccessToCompletedCv =
    counts.purchase_success > 0 ? (counts.purchase_completed / counts.purchase_success) * 100 : 0;

  const userLpToDrawCv = users.page_view_lp > 0 ? (users.draw_completed / users.page_view_lp) * 100 : 0;
  const userDrawToResultCv = users.draw_completed > 0 ? (users.result_viewed / users.draw_completed) * 100 : 0;
  const userResultToDeepCv = users.result_viewed > 0 ? (users.deep_dive_opened / users.result_viewed) * 100 : 0;
  const userDeepToPremiumIntroCv =
    users.deep_dive_opened > 0 ? (users.premium_intro_viewed / users.deep_dive_opened) * 100 : 0;
  const userResultToPremiumIntroCv =
    users.result_viewed > 0 ? (users.premium_intro_viewed / users.result_viewed) * 100 : 0;
  const userPremiumIntroToCheckoutCv =
    users.premium_intro_viewed > 0 ? (users.premium_checkout_clicked / users.premium_intro_viewed) * 100 : 0;
  const userCheckoutToPurchaseSuccessCv =
    users.premium_checkout_clicked > 0 ? (users.purchase_success / users.premium_checkout_clicked) * 100 : 0;
  const userCheckoutToPurchaseCv =
    users.premium_checkout_clicked > 0 ? (users.purchase_completed / users.premium_checkout_clicked) * 100 : 0;
  const userPurchaseSuccessToCompletedCv =
    users.purchase_success > 0 ? (users.purchase_completed / users.purchase_success) * 100 : 0;

  return {
    date: targetDate,
    counts,
    users,
    cv: {
      lp_to_draw: Number(lpToDrawCv.toFixed(2)),
      draw_to_result: Number(drawToResultCv.toFixed(2)),
      result_to_deep: Number(resultToDeepCv.toFixed(2)),
      deep_to_premium_intro: Number(deepToPremiumIntroCv.toFixed(2)),
      result_to_premium_intro: Number(resultToPremiumIntroCv.toFixed(2)),
      premium_intro_to_checkout: Number(premiumIntroToCheckoutCv.toFixed(2)),
      checkout_to_purchase_success: Number(checkoutToPurchaseSuccessCv.toFixed(2)),
      checkout_to_purchase: Number(checkoutToPurchaseCv.toFixed(2)),
      purchase_success_to_purchase_completed: Number(purchaseSuccessToCompletedCv.toFixed(2)),
      result_to_note: Number(resultToNoteCv.toFixed(2)),
      note_to_purchase_success: Number(noteToPurchaseSuccessCv.toFixed(2)),
      note_to_purchase: Number(noteToPurchaseCv.toFixed(2))
    },
    user_cv: {
      lp_to_draw: Number(userLpToDrawCv.toFixed(2)),
      draw_to_result: Number(userDrawToResultCv.toFixed(2)),
      result_to_deep: Number(userResultToDeepCv.toFixed(2)),
      deep_to_premium_intro: Number(userDeepToPremiumIntroCv.toFixed(2)),
      result_to_premium_intro: Number(userResultToPremiumIntroCv.toFixed(2)),
      premium_intro_to_checkout: Number(userPremiumIntroToCheckoutCv.toFixed(2)),
      checkout_to_purchase_success: Number(userCheckoutToPurchaseSuccessCv.toFixed(2)),
      checkout_to_purchase: Number(userCheckoutToPurchaseCv.toFixed(2)),
      purchase_success_to_purchase_completed: Number(userPurchaseSuccessToCompletedCv.toFixed(2))
    }
  };
};

export const createCountShape = () => ({
  page_view_lp: 0,
  page_view_draw: 0,
  page_view_result: 0,
  page_view_deep: 0,
  page_view_premium_intro: 0,
  page_view_premium_complete: 0,
  page_view_premium_reading: 0,
  draw_completed: 0,
  result_viewed: 0,
  deep_dive_opened: 0,
  premium_intro_viewed: 0,
  premium_checkout_clicked: 0,
  premium_reading_viewed: 0,
  premium_three_card_generated: 0,
  premium_access_denied: 0,
  other_actions_toggled: 0,
  share_clicked: 0,
  note_click: 0,
  purchase_success: 0,
  purchase_completed: 0
});
