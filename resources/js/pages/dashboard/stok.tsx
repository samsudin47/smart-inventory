import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../layouts/authenticated-layout';

type Props = {
    user: User;
};

export default function StokDashboard({ user }: Props) {
    return (
        <>
            <Head title="Stok" />

            <AuthenticatedLayout>
                <div className="rounded-md bg-white p-6 shadow-md dark:bg-gray-800">
                    <h1 className="mb-6 text-2xl font-semibold">Stok</h1>

                    <div className="mb-6 rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                        <h2 className="mb-2 text-lg font-medium">Selamat datang, {user.name}!</h2>
                        <p className="text-gray-600 dark:text-gray-300">Kelola dan pantau stok barang di gudang Anda.</p>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
