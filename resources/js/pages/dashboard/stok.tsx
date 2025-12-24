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
                <div className="relative min-h-full flex flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                    {/* Background Image Layer - Same as login/register */}
                    <div
                        className="absolute inset-0 opacity-30 dark:opacity-50 rounded-xl pointer-events-none"
                        style={{
                            backgroundImage: 'url(/public/smart-inventory.PNG)',
                            backgroundSize: '60%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        }}
                    />
                    
                    {/* Dark Mode Overlay */}
                    <div className="absolute inset-0 bg-background/50 dark:bg-background/60 rounded-xl pointer-events-none" />
                    
                    {/* Content Layer */}
                    <div className="relative z-10 rounded-md bg-white p-6 shadow-md dark:bg-gray-800">
                        <h1 className="mb-6 text-2xl font-semibold">Stok</h1>

                        <div className="mb-6 rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                            <h2 className="mb-2 text-lg font-medium">Selamat datang, {user.name}!</h2>
                            <p className="text-gray-600 dark:text-gray-300">Kelola dan pantau stok barang di gudang Anda.</p>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
