"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

interface ProductStats {
  name: string;
  deliveredCount: number;
  deliveredAmount: number;
}

interface DailyProductStats {
  name: string;
  count: number;
  amount: number;
}

interface DailyStats {
  date: string;
  orderedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  inTransitCount: number;
  products: DailyProductStats[];
  orderedAmount: number;
  deliveredAmount: number;
  cancelledAmount: number;
  inTransitAmount: number;
}

interface OzonReportData {
  ordersCount: number;
  totalAmount: number;
  deliveredCount: number;
  deliveredAmount: number;
  products: ProductStats[];
  periodStart: string;
  periodEnd: string;
  dailyStats: DailyStats[];
}

export default function OzonSalesAnalysis() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<OzonReportData | null>(null);
  const [fileName, setFileName] = useState("");

  // Добавляем новое состояние для отображения отчета по дням
  const [showDailyReport, setShowDailyReport] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    try {
      const text = await file.text();
      const parsedData = parseOzonCSV(text);
      setReportData(parsedData);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      alert("Ошибка при обработке файла. Проверьте формат файла.");
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для форматирования даты в единый формат DD.MM.YYYY
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const parseOzonCSV = (csvText: string): OzonReportData => {
    const lines = csvText.split("\n").filter((line) => line.trim() !== "");

    // Пропускаем заголовок и находим индексы колонок
    const headerLine = lines[0];
    const headers = headerLine
      .split(";")
      .map((header) => header.trim().replace(/"/g, ""));

    // Находим индексы нужных колонок
    const quantityIndex = headers.findIndex(
      (header) => header.toLowerCase().includes("количество") || header === "Q"
    );

    const amountIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("оплачено") ||
        header.toLowerCase().includes("цена") ||
        header === "O"
    );

    const statusIndex = headers.findIndex(
      (header) => header.toLowerCase().includes("статус") || header === "E"
    );

    const productNameIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("наименование") ||
        header.toLowerCase().includes("товар") ||
        header === "L"
    );

    const dateIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("принят") ||
        header.toLowerCase().includes("обработк") ||
        header === "C"
    );

    // Если не нашли по названиям, используем индексы (Q=16, O=15, E=4, L=9, C=2 если считать с 0)
    const finalQuantityIndex = quantityIndex !== -1 ? quantityIndex : 16;
    const finalAmountIndex = amountIndex !== -1 ? amountIndex : 15;
    const finalStatusIndex = statusIndex !== -1 ? statusIndex : 4;
    const finalProductNameIndex =
      productNameIndex !== -1 ? productNameIndex : 9;
    const finalDateIndex = dateIndex !== -1 ? dateIndex : 2;

    let ordersCount = 0;
    let totalAmount = 0;
    let deliveredCount = 0;
    let deliveredAmount = 0;

    // Объект для группировки по товарам (общий)
    const productsMap: { [key: string]: ProductStats } = {};

    // Объект для группировки по дням
    const dailyStatsMap: { [key: string]: DailyStats } = {};

    // Массив для хранения всех дат
    const allDates: Date[] = [];

    // Обрабатываем данные, начиная со второй строки
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line
        .split(";")
        .map((value) => value.trim().replace(/"/g, ""));

      if (
        values.length >
        Math.max(
          finalQuantityIndex,
          finalAmountIndex,
          finalStatusIndex,
          finalProductNameIndex,
          finalDateIndex
        )
      ) {
        const quantity = parseFloat(values[finalQuantityIndex]) || 0;
        const amount = parseFloat(values[finalAmountIndex]) || 0;
        const status = values[finalStatusIndex] || "";
        const productName =
          values[finalProductNameIndex] || "Неизвестный товар";
        const dateTime = values[finalDateIndex] || "";

        // Парсим дату и извлекаем только дату (без времени)
        let dateStr = "";
        let parsedDate: Date | null = null;

        if (dateTime) {
          if (dateTime.includes("-")) {
            // Формат: '2025-11-14 16:00:58'
            parsedDate = new Date(dateTime.replace(" ", "T"));
          } else if (dateTime.includes(".")) {
            // Формат: '06.11.2025 17:09'
            const [datePart, timePart] = dateTime.split(" ");
            const [day, month, year] = datePart.split(".").map(Number);
            if (timePart) {
              const [hours, minutes] = timePart.split(":").map(Number);
              parsedDate = new Date(year, month - 1, day, hours, minutes);
            } else {
              parsedDate = new Date(year, month - 1, day);
            }
          }

          if (parsedDate && !isNaN(parsedDate.getTime())) {
            allDates.push(parsedDate);
            // Форматируем дату в строку DD.MM.YYYY
            dateStr = formatDate(parsedDate);
          }
        }

        // Инициализируем статистику по дню, если еще не инициализирована
        if (dateStr && !dailyStatsMap[dateStr]) {
          dailyStatsMap[dateStr] = {
            date: dateStr,
            orderedCount: 0,
            deliveredCount: 0,
            cancelledCount: 0,
            inTransitCount: 0,
            products: [],
            orderedAmount: 0,
            deliveredAmount: 0,
            cancelledAmount: 0,
            inTransitAmount: 0,
          };
        }

        // Все заказы
        ordersCount += quantity;
        totalAmount += amount;

        // Обновляем общую статистику по дням
        if (dateStr) {
          dailyStatsMap[dateStr].orderedCount += quantity;
          dailyStatsMap[dateStr].orderedAmount += amount;
        }

        // Только доставленные заказы (выкупы)
        const isDelivered = status.toLowerCase().includes("доставлен");
        const isCancelled = status.toLowerCase().includes("отмен");
        const isInTransit = !isDelivered && !isCancelled;

        if (isDelivered) {
          deliveredCount += quantity;
          deliveredAmount += amount;

          if (dateStr) {
            dailyStatsMap[dateStr].deliveredCount += quantity;
            dailyStatsMap[dateStr].deliveredAmount += amount;
          }

          // Добавляем в общую статистику по товарам
          if (!productsMap[productName]) {
            productsMap[productName] = {
              name: productName,
              deliveredCount: 0,
              deliveredAmount: 0,
            };
          }
          productsMap[productName].deliveredCount += quantity;
          productsMap[productName].deliveredAmount += amount;
        }

        // Отмененные заказы
        if (isCancelled && dateStr) {
          dailyStatsMap[dateStr].cancelledCount += quantity;
          dailyStatsMap[dateStr].cancelledAmount += amount;
        }

        // Заказы в пути
        if (isInTransit && dateStr) {
          dailyStatsMap[dateStr].inTransitCount += quantity;
          dailyStatsMap[dateStr].inTransitAmount += amount;
        }

        // Добавляем товар в статистику по дням
        if (dateStr) {
          // Проверяем, есть ли уже такой товар в статистике дня
          const existingProduct = dailyStatsMap[dateStr].products.find(
            (p: DailyProductStats) => p.name === productName
          );

          if (existingProduct) {
            existingProduct.count += quantity;
            existingProduct.amount += amount;
          } else {
            dailyStatsMap[dateStr].products.push({
              name: productName,
              count: quantity,
              amount: amount,
            });
          }
        }
      }
    }

    // Определяем период отчета
    let periodStart = "";
    let periodEnd = "";

    if (allDates.length > 0) {
      const sortedDates = [...allDates].sort(
        (a, b) => a.getTime() - b.getTime()
      );
      periodStart = formatDate(sortedDates[0]);
      periodEnd = formatDate(sortedDates[sortedDates.length - 1]);
    }

    // Преобразуем объект в массив и сортируем по дате (от новых к старым)
    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split(".").map(Number);
      const [dayB, monthB, yearB] = b.date.split(".").map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateB.getTime() - dateA.getTime(); // Новые даты первыми
    });

    // Преобразуем объект в массив и сортируем по количеству выкупов (по убыванию)
    const products = Object.values(productsMap)
      .sort((a, b) => b.deliveredCount - a.deliveredCount)
      .filter((product) => product.deliveredCount > 0);

    return {
      ordersCount: Math.round(ordersCount),
      totalAmount: Math.round(totalAmount),
      deliveredCount: Math.round(deliveredCount),
      deliveredAmount: Math.round(deliveredAmount),
      products,
      periodStart,
      periodEnd,
      dailyStats,
    };
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === "text/csv") {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Расчет дополнительных показателей
  const averageOrderValue =
    reportData && reportData.ordersCount > 0
      ? Math.round(reportData.totalAmount / reportData.ordersCount)
      : 0;

  const averageDeliveredValue =
    reportData && reportData.deliveredCount > 0
      ? Math.round(reportData.deliveredAmount / reportData.deliveredCount)
      : 0;

  const deliveryRate =
    reportData && reportData.ordersCount > 0
      ? Math.round((reportData.deliveredCount / reportData.ordersCount) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Навигация */}
        <button
          onClick={() => router.push("/ozon")}
          className="mb-6 text-blue-500 hover:text-blue-700 transition-colors font-semibold"
        >
          ← Назад к Ozon
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Анализ продаж Ozon
        </h1>
        <p className="text-gray-600 mb-8">
          Загрузите отчет в формате CSV для анализа показателей продаж
        </p>

        {/* Блок загрузки файла */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Загрузка отчета</h2>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />

            <div className="flex flex-col items-center">
              <svg
                className="w-12 h-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>

              <p className="text-lg font-medium text-gray-700 mb-2">
                Нажмите или перетащите файл для загрузки
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Поддерживается только CSV формат отчетов Ozon
              </p>

              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
                Выбрать файл
              </button>
            </div>
          </div>

          {fileName && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">
                ✅ Файл загружен:{" "}
                <span className="font-semibold">{fileName}</span>
              </p>
            </div>
          )}

          {isLoading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-600 mt-2">Обработка файла...</p>
            </div>
          )}
        </div>

        {/* Блок с результатами */}
        {reportData && (
          <div className="bg-white rounded-lg shadow-md text-gray-800 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <h2 className="text-3xl font-semibold mb-2 md:mb-0">
                Результаты анализа
              </h2>
              {reportData.periodStart && reportData.periodEnd && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <p className="text-blue-700 font-medium text-lg">
                    Период отчета: {reportData.periodStart} -{" "}
                    {reportData.periodEnd}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Количество заказов */}
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Всего заказов
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {reportData.ordersCount.toLocaleString()} шт
                    </p>
                    <p className="text-lg text-blue-500 mt-1">
                      {reportData.totalAmount.toLocaleString()} ₽
                    </p>
                  </div>
                  <div className="text-blue-500 bg-blue-100 p-3 rounded-full">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Общее количество заказов за период
                </p>
              </div>

              {/* Количество выкупов */}
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Выкупленные заказы
                    </h3>
                    <p className="text-3xl font-bold text-green-600">
                      {reportData.deliveredCount.toLocaleString()} шт
                    </p>
                    <p className="text-lg text-green-500 mt-1">
                      {reportData.deliveredAmount.toLocaleString()} ₽
                    </p>
                  </div>
                  <div className="text-green-500 bg-green-100 p-3 rounded-full">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Доставленные и выкупленные товары
                </p>
              </div>
            </div>

            {/* Дополнительная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {averageOrderValue.toLocaleString()} ₽
                </div>
                <div className="text-sm text-gray-600">
                  Средний чек (все заказы)
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {averageDeliveredValue.toLocaleString()} ₽
                </div>
                <div className="text-sm text-gray-600">
                  Средний чек (выкупы)
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {deliveryRate}%
                </div>
                <div className="text-sm text-gray-600">Процент выкупа</div>
              </div>
            </div>

            {/* Статистика по товарам */}
            {reportData.products.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">
                  Статистика по товарам (выкупленные)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left">
                          Товар
                        </th>
                        <th className="border border-gray-300 p-3 text-left">
                          Количество выкупов
                        </th>
                        <th className="border border-gray-300 p-3 text-left">
                          Сумма выкупов
                        </th>
                        <th className="border border-gray-300 p-3 text-left">
                          Средний чек
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.products.map((product, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="border border-gray-300 p-3 font-medium">
                            {product.name}
                          </td>
                          <td className="border border-gray-300 p-3">
                            {product.deliveredCount.toLocaleString()} шт
                          </td>
                          <td className="border border-gray-300 p-3">
                            {product.deliveredAmount.toLocaleString()} ₽
                          </td>
                          <td className="border border-gray-300 p-3">
                            {Math.round(
                              product.deliveredAmount / product.deliveredCount
                            ).toLocaleString()}{" "}
                            ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Сводка по товарам */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {reportData.products.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Всего товаров с выкупами
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {reportData.products
                        .reduce(
                          (max, product) =>
                            product.deliveredCount > max
                              ? product.deliveredCount
                              : max,
                          0
                        )
                        .toLocaleString()}{" "}
                      шт
                    </div>
                    <div className="text-sm text-gray-600">
                      Максимум выкупов у одного товара
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {reportData.products
                        .reduce(
                          (total, product) => total + product.deliveredCount,
                          0
                        )
                        .toLocaleString()}{" "}
                      шт
                    </div>
                    <div className="text-sm text-gray-600">
                      Общее количество выкупов
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Дополнительная информация */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">
                Сводка по отчету
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Всего заказов:</span>{" "}
                  {reportData.ordersCount.toLocaleString()} шт
                </div>
                <div>
                  <span className="font-medium">Выкупленные заказы:</span>{" "}
                  {reportData.deliveredCount.toLocaleString()} шт
                </div>
                <div>
                  <span className="font-medium">Общая сумма:</span>{" "}
                  {reportData.totalAmount.toLocaleString()} ₽
                </div>
                <div>
                  <span className="font-medium">Сумма выкупов:</span>{" "}
                  {reportData.deliveredAmount.toLocaleString()} ₽
                </div>
                <div>
                  <span className="font-medium">Процент выкупа:</span>{" "}
                  {deliveryRate}%
                </div>
                <div>
                  <span className="font-medium">Товаров с выкупами:</span>{" "}
                  {reportData.products.length} шт
                </div>
                {reportData.periodStart && reportData.periodEnd && (
                  <>
                    <div>
                      <span className="font-medium">Начало периода:</span>{" "}
                      {reportData.periodStart}
                    </div>
                    <div>
                      <span className="font-medium">Конец периода:</span>{" "}
                      {reportData.periodEnd}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Кнопка для показа отчета по дням */}
            {reportData.dailyStats.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowDailyReport(!showDailyReport)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center mx-auto"
                >
                  {showDailyReport
                    ? "Скрыть отчет по дням"
                    : "Сформировать отчет по дням"}
                  <svg
                    className={`w-5 h-5 ml-2 transition-transform ${
                      showDailyReport ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Отчет по дням */}
            {showDailyReport && reportData.dailyStats.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h3 className="text-2xl font-semibold mb-6 text-center">
                  Отчет по дням
                </h3>

                {reportData.dailyStats.map(
                  (day: DailyStats, dayIndex: number) => (
                    <div key={dayIndex} className="mb-8 last:mb-0">
                      {/* Заголовок дня */}
                      <div className="bg-gray-800 text-white rounded-t-lg p-4">
                        <h4 className="text-xl font-semibold">
                          Дата: {day.date}
                        </h4>
                      </div>

                      {/* Основная статистика дня */}
                      <div className="border border-gray-300 border-t-0 rounded-b-lg p-4">
                        {/* Сводка по статусам */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-lg font-bold text-blue-600">
                              {day.orderedCount} шт
                            </div>
                            <div className="text-sm text-gray-600">
                              Заказано
                            </div>
                            <div className="text-sm text-blue-500">
                              {day.orderedAmount.toLocaleString()} ₽
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-lg font-bold text-green-600">
                              {day.deliveredCount} шт
                            </div>
                            <div className="text-sm text-gray-600">
                              Доставлено
                            </div>
                            <div className="text-sm text-green-500">
                              {day.deliveredAmount.toLocaleString()} ₽
                            </div>
                          </div>

                          <div className="bg-red-50 rounded-lg p-4">
                            <div className="text-lg font-bold text-red-600">
                              {day.cancelledCount} шт
                            </div>
                            <div className="text-sm text-gray-600">
                              Отменено
                            </div>
                            <div className="text-sm text-red-500">
                              {day.cancelledAmount.toLocaleString()} ₽
                            </div>
                          </div>

                          <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="text-lg font-bold text-yellow-600">
                              {day.inTransitCount} шт
                            </div>
                            <div className="text-sm text-gray-600">В пути</div>
                            <div className="text-sm text-yellow-500">
                              {day.inTransitAmount.toLocaleString()} ₽
                            </div>
                          </div>
                        </div>

                        {/* Детализация по товарам */}
                        {day.products.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-semibold text-gray-700 mb-3">
                              Детализация по товарам:
                            </h5>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-left">
                                      Товар
                                    </th>
                                    <th className="border border-gray-300 p-2 text-left">
                                      Количество
                                    </th>
                                    <th className="border border-gray-300 p-2 text-left">
                                      Сумма
                                    </th>
                                    <th className="border border-gray-300 p-2 text-left">
                                      Средняя цена
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.products.map(
                                    (
                                      product: DailyProductStats,
                                      productIndex: number
                                    ) => (
                                      <tr
                                        key={productIndex}
                                        className={
                                          productIndex % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                        }
                                      >
                                        <td className="border border-gray-300 p-2 font-medium">
                                          {product.name}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          {product.count} шт
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          {product.amount.toLocaleString()} ₽
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          {Math.round(
                                            product.amount / product.count
                                          ).toLocaleString()}{" "}
                                          ₽
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Сводка по товарам за день */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="bg-gray-50 p-3 rounded">
                                <span className="font-medium">
                                  Всего товаров:
                                </span>{" "}
                                {day.products.length}
                              </div>
                              <div className="bg-gray-50 p-3 rounded">
                                <span className="font-medium">
                                  Общее количество:
                                </span>{" "}
                                {day.products.reduce(
                                  (sum: number, p: DailyProductStats) =>
                                    sum + p.count,
                                  0
                                )}{" "}
                                шт
                              </div>
                              <div className="bg-gray-50 p-3 rounded">
                                <span className="font-medium">
                                  Общая сумма:
                                </span>{" "}
                                {day.products
                                  .reduce(
                                    (sum: number, p: DailyProductStats) =>
                                      sum + p.amount,
                                    0
                                  )
                                  .toLocaleString()}{" "}
                                ₽
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Процентные показатели */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <h5 className="font-semibold text-gray-700 mb-2">
                            Процентные показатели:
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">
                                  Процент доставки:
                                </span>
                                <span className="text-sm font-medium">
                                  {day.orderedCount > 0
                                    ? Math.round(
                                        (day.deliveredCount /
                                          day.orderedCount) *
                                          100
                                      )
                                    : 0}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      day.orderedCount > 0
                                        ? (day.deliveredCount /
                                            day.orderedCount) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm text-gray-600">
                                  Процент отмен:
                                </span>
                                <span className="text-sm font-medium">
                                  {day.orderedCount > 0
                                    ? Math.round(
                                        (day.cancelledCount /
                                          day.orderedCount) *
                                          100
                                      )
                                    : 0}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      day.orderedCount > 0
                                        ? (day.cancelledCount /
                                            day.orderedCount) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Сводка по всем дням */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-gray-800 mb-3">
                    Сводка по всем дням:
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {reportData.dailyStats
                          .reduce(
                            (sum: number, day: DailyStats) =>
                              sum + day.orderedCount,
                            0
                          )
                          .toLocaleString()}{" "}
                        шт
                      </div>
                      <div className="text-sm text-gray-600">
                        Всего заказано
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {reportData.dailyStats
                          .reduce(
                            (sum: number, day: DailyStats) =>
                              sum + day.deliveredCount,
                            0
                          )
                          .toLocaleString()}{" "}
                        шт
                      </div>
                      <div className="text-sm text-gray-600">
                        Всего доставлено
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {reportData.dailyStats
                          .reduce(
                            (sum: number, day: DailyStats) =>
                              sum + day.cancelledCount,
                            0
                          )
                          .toLocaleString()}{" "}
                        шт
                      </div>
                      <div className="text-sm text-gray-600">
                        Всего отменено
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">
                        {reportData.dailyStats
                          .reduce(
                            (sum: number, day: DailyStats) =>
                              sum + day.inTransitCount,
                            0
                          )
                          .toLocaleString()}{" "}
                        шт
                      </div>
                      <div className="text-sm text-gray-600">Всего в пути</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Инструкция */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2 text-2xl">
            Как получить отчет из Ozon?
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700 text-lg">
            <li>Зайдите в личный кабинет продавца Ozon</li>
            <li>Перейдите в раздел "Аналитика" → "Отчеты"</li>
            <li>Перейдите в раздел "Заказы" → "Заказы со складов Ozon"</li>
            <li>Выберите нужный период и скачайте отчет</li>
            <li>Загрузите файл в форму выше</li>
          </ol>
          <div className="mt-3 text-xs text-yellow-600"></div>
        </div>
      </div>
    </div>
  );
}
