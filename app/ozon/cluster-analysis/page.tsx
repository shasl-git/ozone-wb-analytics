// app/ozon/cluster-analysis/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";

interface ClusterProductData {
  cluster: string;
  productName: string;
  availableQuantity: number;
  sku: string;
  preparingForSale: number; // Колонка L
  expiringSoon: number; // Колонка O
  returningFromCustomers: number; // Колонка V
}

interface ClusterAnalysisData {
  clusters: string[];
  products: string[];
  data: {
    [productName: string]: {
      [cluster: string]: {
        available: number;
        preparing: number;
        expiring: number;
        returning: number;
      };
    };
  };
  rawData: ClusterProductData[];
}

export default function OzonClusterAnalysis() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<ClusterAnalysisData | null>(
    null
  );
  const [fileName, setFileName] = useState("");
  const [activeView, setActiveView] = useState<"stocks" | "liquidity">(
    "stocks"
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Получаем лист "Товар-кластер"
      const sheetName =
        workbook.SheetNames.find(
          (name) =>
            name.toLowerCase().includes("товар-кластер") ||
            name.toLowerCase().includes("кластер")
        ) || workbook.SheetNames[1];

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      });

      // Парсим данные - приводим к any[][]
      const dataArray = jsonData as any[][];
      const parsedData = parseClusterSheet(dataArray);
      setAnalysisData(parsedData);
    } catch (error) {
      console.error("Error parsing Excel:", error);
      alert("Ошибка при обработке файла. Проверьте формат файла.");
    } finally {
      setIsLoading(false);
    }
  };

  const parseClusterSheet = (data: any[][]): ClusterAnalysisData => {
    const clusterProductData: ClusterProductData[] = [];
    const clustersSet = new Set<string>();
    const productsSet = new Set<string>();

    if (!data || data.length < 5) {
      return {
        clusters: [],
        products: [],
        data: {},
        rawData: [],
      };
    }

    // Начинаем с 5-й строки (индекс 4)
    const startRowIndex = 4;

    // Фиксированные индексы колонок из примера файла
    const clusterIndex = 5; // Столбец F
    const productNameIndex = 1; // Столбец B
    const skuIndex = 2; // Столбец C
    const availableQuantityIndex = 10; // Столбец K (остатки на складах Ozon)
    const preparingForSaleIndex = 11; // Столбец L (готовим к продаже)
    const expiringSoonIndex = 14; // Столбец O (истекает срок годности)
    const returningFromCustomersIndex = 21; // Столбец V (возвращаются от покупателей)

    // Обрабатываем данные, начиная с 5-й строки
    for (let i = startRowIndex; i < data.length; i++) {
      const row = data[i];
      if (
        !row ||
        row.length <=
          Math.max(
            clusterIndex,
            productNameIndex,
            availableQuantityIndex,
            preparingForSaleIndex,
            expiringSoonIndex,
            returningFromCustomersIndex
          )
      ) {
        continue;
      }

      const cluster = String(row[clusterIndex] || "").trim();
      const productName = String(row[productNameIndex] || "").trim();
      const sku = String(row[skuIndex] || "").trim();
      const availableQuantity = parseFloat(row[availableQuantityIndex]) || 0;
      const preparingForSale = parseFloat(row[preparingForSaleIndex]) || 0;
      const expiringSoon = parseFloat(row[expiringSoonIndex]) || 0;
      const returningFromCustomers =
        parseFloat(row[returningFromCustomersIndex]) || 0;

      // Фильтруем заголовки и пустые строки
      if (
        cluster &&
        productName &&
        !cluster.includes("Нередактируемое") &&
        !productName.includes("Нередактируемое") &&
        !cluster.includes("Кластер") &&
        !productName.includes("Название товара")
      ) {
        clusterProductData.push({
          cluster,
          productName,
          availableQuantity,
          sku,
          preparingForSale,
          expiringSoon,
          returningFromCustomers,
        });

        clustersSet.add(cluster);
        productsSet.add(productName);
      }
    }

    // Группируем данные для таблицы (товары -> кластеры)
    const clusters = Array.from(clustersSet);
    const products = Array.from(productsSet);

    const groupedData: {
      [productName: string]: {
        [cluster: string]: {
          available: number;
          preparing: number;
          expiring: number;
          returning: number;
        };
      };
    } = {};

    // Инициализируем структуру
    products.forEach((product) => {
      groupedData[product] = {};
      clusters.forEach((cluster) => {
        groupedData[product][cluster] = {
          available: 0,
          preparing: 0,
          expiring: 0,
          returning: 0,
        };
      });
    });

    // Заполняем данные
    clusterProductData.forEach((item) => {
      if (
        groupedData[item.productName] &&
        groupedData[item.productName][item.cluster]
      ) {
        groupedData[item.productName][item.cluster] = {
          available: item.availableQuantity,
          preparing: item.preparingForSale,
          expiring: item.expiringSoon,
          returning: item.returningFromCustomers,
        };
      }
    });

    return {
      clusters,
      products,
      data: groupedData,
      rawData: clusterProductData,
    };
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (
      files.length > 0 &&
      (files[0].name.endsWith(".xlsx") || files[0].name.endsWith(".xls"))
    ) {
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

  // Расчет суммарных остатков по товарам (только доступные)
  const calculateProductTotals = () => {
    if (!analysisData) return {};

    const totals: { [product: string]: number } = {};

    analysisData.products.forEach((product) => {
      let total = 0;
      analysisData.clusters.forEach((cluster) => {
        total += analysisData.data[product][cluster]?.available || 0;
      });
      totals[product] = total;
    });

    return totals;
  };

  // Расчет суммарных остатков по кластерам (только доступные)
  const calculateClusterTotals = () => {
    if (!analysisData) return {};

    const totals: { [cluster: string]: number } = {};

    analysisData.clusters.forEach((cluster) => {
      let total = 0;
      analysisData.products.forEach((product) => {
        total += analysisData.data[product][cluster]?.available || 0;
      });
      totals[cluster] = total;
    });

    return totals;
  };

  // Расчет дополнительных показателей по товарам
  const calculateProductAdditionalTotals = () => {
    if (!analysisData) {
      return {
        preparingTotals: {},
        expiringTotals: {},
        returningTotals: {},
      };
    }

    const preparingTotals: { [product: string]: number } = {};
    const expiringTotals: { [product: string]: number } = {};
    const returningTotals: { [product: string]: number } = {};

    analysisData.products.forEach((product) => {
      let preparingTotal = 0;
      let expiringTotal = 0;
      let returningTotal = 0;

      analysisData.clusters.forEach((cluster) => {
        const data = analysisData.data[product][cluster];
        if (data) {
          preparingTotal += data.preparing || 0;
          expiringTotal += data.expiring || 0;
          returningTotal += data.returning || 0;
        }
      });

      preparingTotals[product] = preparingTotal;
      expiringTotals[product] = expiringTotal;
      returningTotals[product] = returningTotal;
    });

    return { preparingTotals, expiringTotals, returningTotals };
  };

  // Сортировка товаров по общему количеству (по убыванию)
  const getSortedProducts = () => {
    const totals = calculateProductTotals();
    return (
      analysisData?.products.sort(
        (a, b) => (totals[b] || 0) - (totals[a] || 0)
      ) || []
    );
  };

  // Сортировка кластеров по общему количеству товаров (по убыванию)
  const getSortedClusters = () => {
    const totals = calculateClusterTotals();
    return (
      analysisData?.clusters.sort(
        (a, b) => (totals[b] || 0) - (totals[a] || 0)
      ) || []
    );
  };

  // Расчет количества кластеров с товарами
  const getClustersWithProductsCount = () => {
    if (!analysisData) return 0;

    const clusterTotals = calculateClusterTotals();
    return Object.values(clusterTotals).filter((total) => total > 0).length;
  };

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
          Кластерный анализ остатков Ozon
        </h1>
        <p className="text-gray-600 mb-8">
          Загрузите отчет в формате XLSX для анализа остатков товаров по
          кластерам
        </p>

        {/* Блок загрузки файла */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 ">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Загрузка отчета по кластерам
          </h2>

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
              accept=".xlsx,.xls"
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
                Поддерживается только XLSX формат отчетов Ozon (лист
                "Товар-кластер")
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

        {/* Результаты анализа */}
        {analysisData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                Анализ остатков по кластерам
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveView("stocks")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeView === "stocks"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Остатки
                </button>
                <button
                  onClick={() => setActiveView("liquidity")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeView === "liquidity"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Ликвидность
                </button>
              </div>
            </div>

            {activeView === "stocks" && (
              <>
                {/* Сводная информация */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {getClustersWithProductsCount()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Кластеры с товарами
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisData.products.length}
                    </div>
                    <div className="text-sm text-gray-600">Всего товаров</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {analysisData.rawData.reduce(
                        (sum, item) => sum + item.availableQuantity,
                        0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Общее количество остатков
                    </div>
                  </div>
                </div>

                {/* Таблица остатков */}
                <div className="mb-8 text-gray-800">
                  <h3 className="text-xl font-semibold mb-4">
                    Остатки товаров по кластерам
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Товары по строкам, кластеры по столбцам
                  </p>
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-3 text-left border-b border-r border-gray-300 sticky left-0 bg-gray-100 z-10 min-w-[200px]">
                            Товар
                          </th>
                          {getSortedClusters().map((cluster, index) => (
                            <th
                              key={index}
                              className="p-3 text-left border-b border-gray-300 min-w-[120px]"
                            >
                              <div
                                className="truncate max-w-[120px]"
                                title={cluster}
                              >
                                {cluster}
                              </div>
                            </th>
                          ))}
                          <th className="p-3 text-left border-b border-gray-300 bg-blue-50 font-semibold min-w-[100px]">
                            Всего
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedProducts().map((product, productIndex) => {
                          const productTotals = calculateProductTotals();
                          const total = productTotals[product] || 0;

                          return (
                            <tr
                              key={productIndex}
                              className={
                                productIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }
                            >
                              <td className="p-3 border-b border-r border-gray-300 sticky left-0 bg-white z-10 font-medium">
                                <div
                                  className="truncate max-w-[200px]"
                                  title={product}
                                >
                                  {product}
                                </div>
                              </td>
                              {getSortedClusters().map(
                                (cluster, clusterIndex) => {
                                  const quantity =
                                    analysisData.data[product][cluster]
                                      ?.available || 0;
                                  let bgColor = "";

                                  if (quantity === 0) {
                                    bgColor = "bg-red-50";
                                  } else if (quantity <= 2) {
                                    bgColor = "bg-yellow-50";
                                  } else if (quantity <= 5) {
                                    bgColor = "bg-green-50";
                                  } else {
                                    bgColor = "bg-blue-50";
                                  }

                                  return (
                                    <td
                                      key={clusterIndex}
                                      className={`p-3 border-b border-gray-300 text-center ${bgColor}`}
                                    >
                                      {quantity > 0 ? quantity : "-"}
                                    </td>
                                  );
                                }
                              )}
                              <td className="p-3 border-b border-gray-300 text-center font-semibold bg-blue-50">
                                {total}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Строка с итогами по кластерам */}
                        <tr className="bg-gray-100">
                          <td className="p-3 border-b border-r border-gray-300 sticky left-0 bg-gray-100 z-10 font-semibold">
                            Всего
                          </td>
                          {getSortedClusters().map((cluster, index) => {
                            const clusterTotals = calculateClusterTotals();
                            const total = clusterTotals[cluster] || 0;

                            return (
                              <td
                                key={index}
                                className="p-3 border-b border-gray-300 text-center font-semibold bg-blue-50"
                              >
                                {total}
                              </td>
                            );
                          })}
                          <td className="p-3 border-b border-gray-300 text-center font-bold bg-blue-100">
                            {analysisData.rawData.reduce(
                              (sum, item) => sum + item.availableQuantity,
                              0
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Сводная информация по товарам */}
                <div className="mb-6 text-gray-800">
                  <h3 className="text-xl font-semibold mb-4">
                    Статистика по товарам
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getSortedProducts().map((product, index) => {
                      const totals = calculateProductTotals();
                      const additionalTotals =
                        calculateProductAdditionalTotals();
                      const total = totals[product] || 0;
                      const preparingTotal =
                        additionalTotals?.preparingTotals?.[product] || 0;
                      const expiringTotal =
                        additionalTotals?.expiringTotals?.[product] || 0;
                      const returningTotal =
                        additionalTotals?.returningTotals?.[product] || 0;
                      const productClusters = analysisData.clusters.filter(
                        (cluster) =>
                          analysisData.data[product][cluster]?.available > 0
                      ).length;

                      return (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col h-full"
                        >
                          {/* Заголовок с названием товара и общими остатками */}
                          <div className="flex justify-between items-start mb-3">
                            <h4
                              className="font-semibold text-gray-800 flex-1 mr-2 text-sm line-clamp-2"
                              title={product}
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {product}
                            </h4>
                            <span className="text-lg font-bold text-blue-600 whitespace-nowrap ml-2">
                              {total} шт
                            </span>
                          </div>

                          {/* Основная информация */}
                          <div className="space-y-2 mb-3">
                            <div className="text-sm text-gray-600 flex justify-between">
                              <span>Кластеров:</span>
                              <span className="font-medium">
                                {productClusters}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 flex justify-between">
                              <span>Готовится к продаже:</span>
                              <span className="font-medium">
                                {preparingTotal} шт
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 flex justify-between">
                              <span>Истекает срок годности:</span>
                              <span className="font-medium">
                                {expiringTotal} шт
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 flex justify-between">
                              <span>Возвращаются от покупателя:</span>
                              <span className="font-medium">
                                {returningTotal} шт
                              </span>
                            </div>
                          </div>

                          {/* Распределение по кластерам с прокруткой */}
                          <div className="mt-2 flex-grow">
                            <div className="text-xs text-gray-500 mb-1">
                              Распределение по кластерам:
                            </div>
                            <div
                              className="space-y-1 overflow-y-auto pr-1"
                              style={{ maxHeight: "120px" }}
                            >
                              {analysisData.clusters
                                .filter(
                                  (cluster) =>
                                    analysisData.data[product][cluster]
                                      ?.available > 0
                                )
                                .map((cluster, clusterIndex) => (
                                  <div
                                    key={clusterIndex}
                                    className="flex justify-between text-xs"
                                  >
                                    <span
                                      className="truncate max-w-[70%]"
                                      title={cluster}
                                    >
                                      {cluster}
                                    </span>
                                    <span className="font-medium whitespace-nowrap">
                                      {analysisData.data[product][cluster]
                                        ?.available || 0}{" "}
                                      шт
                                    </span>
                                  </div>
                                ))}
                              {analysisData.clusters.filter(
                                (cluster) =>
                                  analysisData.data[product][cluster]
                                    ?.available > 0
                              ).length === 0 && (
                                <div className="text-xs text-gray-400 italic text-center py-2">
                                  Нет остатков на складах
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeView === "liquidity" && (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">
                  Анализ ликвидности
                </h3>
                <p className="text-gray-600 mb-4">
                  Раздел в разработке. Здесь будет анализ ликвидности товаров по
                  кластерам.
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Функционал будет добавлен в следующем обновлении
                </div>
              </div>
            )}
          </div>
        )}

        {/* Инструкция */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Как получить отчет по остаткам из Ozon?
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Зайдите в личный кабинет продавца Ozon</li>
            <li>Перейдите в раздел "Аналитика" → "Отчеты"</li>
            <li>Продажи со склада озон → Управление остатками "</li>
            <li>Все склады → скачать отчет</li>
            <li>Загрузите отчет в форму выше </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
