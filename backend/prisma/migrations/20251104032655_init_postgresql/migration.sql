-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "consent_status" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "balance_available" DECIMAL(65,30),
    "balance_current" DECIMAL(65,30) NOT NULL,
    "balance_limit" DECIMAL(65,30),
    "iso_currency_code" TEXT NOT NULL DEFAULT 'USD',
    "holder_category" TEXT NOT NULL DEFAULT 'personal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "merchant_name" TEXT,
    "merchant_entity_id" TEXT,
    "payment_channel" TEXT NOT NULL,
    "personal_finance_category_primary" TEXT NOT NULL,
    "personal_finance_category_detailed" TEXT NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "Liability" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "liability_type" TEXT NOT NULL,
    "aprs" TEXT,
    "minimum_payment_amount" DECIMAL(65,30),
    "last_payment_amount" DECIMAL(65,30),
    "is_overdue" BOOLEAN,
    "next_payment_due_date" TIMESTAMP(3),
    "last_statement_balance" DECIMAL(65,30),
    "interest_rate" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "window_days" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "persona_type" TEXT NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "rank" INTEGER NOT NULL,
    "window_days" INTEGER NOT NULL,
    "criteria_met" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT,
    "tags" TEXT NOT NULL,
    "persona_fit" TEXT NOT NULL,
    "signals" TEXT NOT NULL,
    "editorial_summary" TEXT NOT NULL,
    "editorial_priority" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eligibility_rules" TEXT NOT NULL,
    "required_signals" TEXT NOT NULL,
    "exclude_if_has_account" TEXT NOT NULL,
    "persona_fit" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content_id" TEXT,
    "offer_id" TEXT,
    "rationale" TEXT NOT NULL,
    "persona_type" TEXT NOT NULL,
    "signals_used" TEXT NOT NULL,
    "decision_trace" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "agentic_review_status" TEXT,
    "agentic_review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "function_call" TEXT,
    "function_result" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorAuditLog" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT,
    "before_state" TEXT,
    "after_state" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_user_id_idx" ON "Account"("user_id");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Transaction_account_id_date_idx" ON "Transaction"("account_id", "date");

-- CreateIndex
CREATE INDEX "Transaction_merchant_name_idx" ON "Transaction"("merchant_name");

-- CreateIndex
CREATE INDEX "Transaction_personal_finance_category_primary_idx" ON "Transaction"("personal_finance_category_primary");

-- CreateIndex
CREATE UNIQUE INDEX "Liability_account_id_key" ON "Liability"("account_id");

-- CreateIndex
CREATE INDEX "Liability_account_id_idx" ON "Liability"("account_id");

-- CreateIndex
CREATE INDEX "Liability_is_overdue_idx" ON "Liability"("is_overdue");

-- CreateIndex
CREATE INDEX "Signal_user_id_signal_type_window_days_idx" ON "Signal"("user_id", "signal_type", "window_days");

-- CreateIndex
CREATE INDEX "Persona_user_id_rank_idx" ON "Persona"("user_id", "rank");

-- CreateIndex
CREATE INDEX "Persona_user_id_window_days_rank_idx" ON "Persona"("user_id", "window_days", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Content_url_key" ON "Content"("url");

-- CreateIndex
CREATE INDEX "Recommendation_user_id_status_idx" ON "Recommendation"("user_id", "status");

-- CreateIndex
CREATE INDEX "ChatMessage_user_id_timestamp_idx" ON "ChatMessage"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "OperatorAuditLog_operator_id_timestamp_idx" ON "OperatorAuditLog"("operator_id", "timestamp");

-- CreateIndex
CREATE INDEX "OperatorAuditLog_target_type_target_id_idx" ON "OperatorAuditLog"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAuditLog" ADD CONSTRAINT "OperatorAuditLog_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
