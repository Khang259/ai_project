// import { useTranslation } from 'react-i18next';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

// const CameraDashboard = () => {

//     return (
//               {/* Camera Status & Information */}
//       <Card className="border-2 glass">
//         <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//             <Video className="h-5 w-5 text-primary" />
//             {t('settings.cameraInformationFromDatabase')}
//             </CardTitle>
//         </CardHeader>
//         <CardContent>
//             <div className="space-y-3">
//             {cameras.map((camera, index) => (
//                 <div key={camera.id} className="flex items-center justify-between p-3 border rounded-lg">
//                 <div className="flex items-center gap-3">
//                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
//                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
//                     <div>
//                     <p className="font-medium">{camera.camera_name || `Camera ${index + 1}`}</p>
//                     <p className="text-sm text-white font-mono">
//                         {camera.camera_path || t('settings.notConfigured')}
//                     </p>
//                     <p className="text-xs text-white">
//                         {t('settings.area')}: {camera.area} | {t('settings.id')}: {camera.id}
//                     </p>
//                     </div>
//                 </div>
//                 <div className="text-right">
//                     <p className="text-xs text-white">{t('settings.status')}</p>
//                     <p className="text-sm font-medium text-green-600">{t('settings.active')}</p>
//                     <p className="text-xs text-white">
//                     {camera.created_at ? new Date(camera.created_at).toLocaleDateString('vi-VN') : t('settings.new')}
//                     </p>
//                 </div>
//                 </div>
//             ))}
//             </div>
//         </CardContent>
//         </Card>
//     )
// }