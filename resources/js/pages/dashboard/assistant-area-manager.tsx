import { type User } from '@/types';
import { Head } from '@inertiajs/react';
import { MapPin, FileText, Package } from 'lucide-react';
import AuthenticatedLayout from '../../layouts/authenticated-layout';

type Props = {
    user: User;
};

export default function AssistantAreaManagerDashboard({ user }: Props) {
    return (
        <>
            <Head title="Dashboard Assistant Area Manager" />

            <AuthenticatedLayout>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            Selamat datang, {user.name}!
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Sebagai Assistant Area Manager, Anda dapat mengelola area dan mengawasi operasional di wilayah Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 transition-all duration-300 hover:shadow-lg dark:from-blue-900/20 dark:to-blue-800/20">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-2 dark:bg-blue-400/20">
                                        <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        Manajemen Area
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Kelola dan pantau area yang menjadi tanggung jawab Anda.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6 transition-all duration-300 hover:shadow-lg dark:from-green-900/20 dark:to-green-800/20">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-3 inline-flex rounded-lg bg-green-500/10 p-2 dark:bg-green-400/20">
                                        <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        Laporan Operasional
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Lihat dan analisis laporan operasional area Anda.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 transition-all duration-300 hover:shadow-lg dark:from-purple-900/20 dark:to-purple-800/20">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-3 inline-flex rounded-lg bg-purple-500/10 p-2 dark:bg-purple-400/20">
                                        <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        Stok
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Kelola dan pantau stok barang di gudang.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </>
    );
}
