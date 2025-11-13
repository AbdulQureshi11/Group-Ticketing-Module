const PaymentProofModel = (DataTypes, sequelize) => {
    const PaymentProof = sequelize.define(
        "payment_proofs",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            booking_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            uploaded_by: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            bank_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: true,
            },
            reference_no: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            file_path: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            file_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            verified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            verified_by: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            verified_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            uploaded_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            timestamps: false,
            tableName: "payment_proofs",
        }
    );

    return PaymentProof;
};

export default PaymentProofModel;