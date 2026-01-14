import React from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../../app/Layout';
import { ReceiptDetailView } from './ReceiptDetailView';

export const ReceiptDetailPage: React.FC = () => {
    const { id } = useParams();

    return (
        <Layout>
            <div className="md:py-8 px-4">
                {id ? <ReceiptDetailView receiptId={id} /> : <div>Invalid ID</div>}
            </div>
        </Layout>
    );
};
