"use client";

import { useRouter } from "next/navigation";

export default function OzonPage() {
  const router = useRouter();

  const features = [
    {
      title: "Калькулятор юнит-экономики",
      description: "Расчет прибыльности товаров с учетом всех затрат Ozon",
      path: "/ozon/unit-economics",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Информация по продажам",
      description: "Детальная аналитика продаж и трендов",
      path: "/ozon/sales",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Информация по кластерам",
      description: "Анализ товарных кластеров и категорий",
      path: "/ozon/cluster-analysis",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Хедер */}
        <div className="text-center mb-12">
          <button
            onClick={() => router.push("/")}
            className="mb-4 text-blue-500 hover:text-blue-700 transition-colors"
          >
            ← Назад на главную
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Ozon Analytics
          </h1>
          <p className="text-gray-600">
            Выберите нужный инструмент для анализа вашего бизнеса на Ozon
          </p>
        </div>

        {/* Кнопки функционала */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <button
              key={index}
              onClick={() => router.push(feature.path)}
              className={`${feature.color} text-white p-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 text-left`}
            >
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm opacity-90">{feature.description}</p>
            </button>
          ))}
        </div>

        {/* Дополнительная информация */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6 text-gray-800">
          <h2 className="text-2xl font-semibold mb-4">О аналитике Ozon</h2>
          <p className="text-gray-600 mb-4">
            Специализированные инструменты для анализа маркетплейса Ozon,
            учитывающие особенности его комиссий, логистики и маркетинговых
            возможностей.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Учет специфических комиссий Ozon</li>
            <li>Анализ программ продвижения Ozon</li>
            <li>Интеграция с логистикой Ozon FBS/FBO</li>
            <li>Мониторинг рейтингов и отзывов</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
