"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OzonUnitEconomics() {
  const router = useRouter();

  // Состояния для курсов валют
  const [exchangeRates, setExchangeRates] = useState({
    usd: 0,
    cny: 0,
  });

  // Состояния для конвертации валют
  const [currencyConversion, setCurrencyConversion] = useState({
    usdAmount: 0,
    cnyAmount: 0,
  });

  // Состояния для себестоимости
  const [costData, setCostData] = useState({
    purchaseCost: 0,
    quantity: 0,
    chinaShipping: 0,
    russiaShipping: 0,
    fulfillment: 0,
    additionalCosts: 0,
  });

  // Состояния для расчета маржинальности
  const [marginData, setMarginData] = useState({
    sellingPrice: 0,
    ozonRewardPercent: 0, // теперь это процент
    acquiring: 0,
    processing: 0,
    taxPercent: 0,
  });

  // Валидация полей
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});

  // Расчеты
  const usdInRubles = currencyConversion.usdAmount * exchangeRates.usd;
  const cnyInRubles = currencyConversion.cnyAmount * exchangeRates.cny;

  // Расчет себестоимости
  const totalAdditionalCosts =
    costData.chinaShipping +
    costData.russiaShipping +
    costData.fulfillment +
    costData.additionalCosts;
  const totalCost =
    costData.purchaseCost * costData.quantity + totalAdditionalCosts;
  const costPerItem = costData.quantity > 0 ? totalCost / costData.quantity : 0;

  // Расчет маржинальности (обновлено)
  const ozonRewardAmount =
    (marginData.sellingPrice * marginData.ozonRewardPercent) / 100;
  const totalExpenses =
    ozonRewardAmount + marginData.acquiring + marginData.processing;
  const taxAmount = (marginData.sellingPrice * marginData.taxPercent) / 100;
  const fullCost = costPerItem + totalExpenses + taxAmount;
  const margin = marginData.sellingPrice - fullCost;
  const marginPercent =
    marginData.sellingPrice > 0 ? (margin / marginData.sellingPrice) * 100 : 0;
  const profitabilityPercent = fullCost > 0 ? (margin / fullCost) * 100 : 0;

  // Валидация формы
  const validateField = (field: string, value: number) => {
    if (isNaN(value) || value < 0) {
      setValidationErrors((prev) => ({ ...prev, [field]: true }));
      return false;
    } else {
      setValidationErrors((prev) => ({ ...prev, [field]: false }));
      return true;
    }
  };

  const handleExchangeRateChange = (currency: "usd" | "cny", value: string) => {
    const numValue = parseFloat(value) || 0;
    setExchangeRates((prev) => ({ ...prev, [currency]: numValue }));
    validateField(`${currency}Rate`, numValue);
  };

  const handleCurrencyConversionChange = (
    currency: "usdAmount" | "cnyAmount",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setCurrencyConversion((prev) => ({ ...prev, [currency]: numValue }));
    validateField(currency, numValue);
  };

  const handleCostDataChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCostData((prev) => ({ ...prev, [field]: numValue }));
    validateField(field, numValue);
  };

  const handleMarginDataChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setMarginData((prev) => ({ ...prev, [field]: numValue }));
    validateField(field, numValue);
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
          Калькулятор юнит-экономики Ozon
        </h1>
        <p className="text-gray-600 mb-8">
          Расчет прибыльности товаров с учетом всех затрат
        </p>

        {/* Блок курсов валют */}
        <div className="bg-white rounded-lg text-gray-700 shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Курсы валют к рублю</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Валюта
              </label>
              <div className="text-center font-medium">Доллары (USD)</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Юани (CNY)
              </label>
              <div className="text-center font-medium">Юани (CNY)</div>
            </div>
            <div className="hidden md:block"></div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Курс к рублю
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={exchangeRates.usd || ""}
                onChange={(e) =>
                  handleExchangeRateChange("usd", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.usdRate
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Например: 92.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Курс к рублю
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={exchangeRates.cny || ""}
                onChange={(e) =>
                  handleExchangeRateChange("cny", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.cnyRate
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Например: 12.8"
              />
            </div>
          </div>
        </div>

        {/* Конвертер валют */}
        <div className="bg-white rounded-lg text-gray-700 shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Конвертер валют в рубли
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Валюта
              </label>
              <div className="text-center font-medium">Доллары (USD)</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Юани (CNY)
              </label>
              <div className="text-center font-medium">Юани (CNY)</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                В рублях
              </label>
              <div className="text-center font-medium">Рубли (RUB)</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество
              </label>
              <input
                type="number"
                step="0.01"
                value={currencyConversion.usdAmount || ""}
                onChange={(e) =>
                  handleCurrencyConversionChange("usdAmount", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.usdAmount
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество
              </label>
              <input
                type="number"
                step="0.01"
                value={currencyConversion.cnyAmount || ""}
                onChange={(e) =>
                  handleCurrencyConversionChange("cnyAmount", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.cnyAmount
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full text-center py-2 bg-gray-100 rounded-lg font-semibold">
                {usdInRubles + cnyInRubles} ₽
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>USD в RUB: {usdInRubles} ₽</div>
            <div>CNY в RUB: {cnyInRubles} ₽</div>
          </div>
        </div>

        {/* Расчет себестоимости */}
        <div className="bg-white rounded-lg text-gray-700 shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Расчет себестоимости</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Закупочная стоимость (за единицу, ₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costData.purchaseCost || ""}
                onChange={(e) =>
                  handleCostDataChange("purchaseCost", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.purchaseCost
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество штук
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                value={costData.quantity || ""}
                onChange={(e) =>
                  handleCostDataChange("quantity", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.quantity
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Доставка по Китаю (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costData.chinaShipping || ""}
                onChange={(e) =>
                  handleCostDataChange("chinaShipping", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.chinaShipping
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Доставка до России (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costData.russiaShipping || ""}
                onChange={(e) =>
                  handleCostDataChange("russiaShipping", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.russiaShipping
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фулфилмент + упаковка + приемка (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costData.fulfillment || ""}
                onChange={(e) =>
                  handleCostDataChange("fulfillment", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.fulfillment
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дополнительные расходы (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costData.additionalCosts || ""}
                onChange={(e) =>
                  handleCostDataChange("additionalCosts", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.additionalCosts
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Результаты себестоимости */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Себестоимость всех товаров:
              </h3>
              <div className="text-2xl font-bold text-blue-600">
                {totalCost.toFixed(2)} ₽
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Себестоимость одного товара:
              </h3>
              <div className="text-2xl font-bold text-blue-600">
                {costPerItem.toFixed(2)} ₽
              </div>
            </div>
          </div>
        </div>

        {/* Расчет маржинальности */}
        <div className="bg-white text-gray-700 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Расчет маржинальности и рентабельности
          </h2>

          {/* Ввод данных */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена продажи на Ozon (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={marginData.sellingPrice || ""}
                onChange={(e) =>
                  handleMarginDataChange("sellingPrice", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.sellingPrice
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вознаграждение Ozon (%)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={marginData.ozonRewardPercent || ""}
                onChange={(e) =>
                  handleMarginDataChange("ozonRewardPercent", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.ozonRewardPercent
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
              {marginData.ozonRewardPercent > 0 &&
                marginData.sellingPrice > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    Сумма: {ozonRewardAmount.toFixed(2)} ₽
                  </div>
                )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Эквайринг (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={marginData.acquiring || ""}
                onChange={(e) =>
                  handleMarginDataChange("acquiring", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.acquiring
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Обработка + доставка + логистика (₽)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={marginData.processing || ""}
                onChange={(e) =>
                  handleMarginDataChange("processing", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.processing
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Налог (%)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={marginData.taxPercent || ""}
                onChange={(e) =>
                  handleMarginDataChange("taxPercent", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.taxPercent
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Таблица результатов */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left">
                    Показатель
                  </th>
                  <th className="border border-gray-300 p-3 text-left">
                    Значение
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">
                    Себестоимость одного товара
                  </td>
                  <td className="border border-gray-300 p-3">
                    {costPerItem.toFixed(2)} ₽
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">
                    Цена продажи
                  </td>
                  <td className="border border-gray-300 p-3">
                    {marginData.sellingPrice} ₽
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">
                    Вознаграждение Ozon ({marginData.ozonRewardPercent}%)
                  </td>
                  <td className="border border-gray-300 p-3">
                    {ozonRewardAmount.toFixed(2)} ₽
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">
                    Эквайринг
                  </td>
                  <td className="border border-gray-300 p-3">
                    {marginData.acquiring} ₽
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">
                    Обработка + доставка + логистика
                  </td>
                  <td className="border border-gray-300 p-3">
                    {marginData.processing} ₽
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-3 font-semibold">
                    Общие расходы
                  </td>
                  <td className="border border-gray-300 p-3 font-semibold">
                    {totalExpenses.toFixed(2)} ₽
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">
                    Налог ({marginData.taxPercent}%)
                  </td>
                  <td className="border border-gray-300 p-3">
                    {taxAmount.toFixed(2)} ₽
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="border border-gray-300 p-3 font-semibold">
                    Себестоимость full
                  </td>
                  <td className="border border-gray-300 p-3 font-semibold">
                    {fullCost.toFixed(2)} ₽
                  </td>
                </tr>
                <tr className={margin >= 0 ? "bg-green-50" : "bg-red-50"}>
                  <td className="border border-gray-300 p-3 font-semibold">
                    Маржинальность
                  </td>
                  <td className="border border-gray-300 p-3 font-semibold">
                    {margin.toFixed(2)} ₽ ({marginPercent.toFixed(2)}%)
                  </td>
                </tr>
                <tr
                  className={
                    profitabilityPercent >= 0 ? "bg-green-50" : "bg-red-50"
                  }
                >
                  <td className="border border-gray-300 p-3 font-semibold">
                    Рентабельность
                  </td>
                  <td className="border border-gray-300 p-3 font-semibold">
                    {profitabilityPercent.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Визуальная индикация */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Результат:</h3>
            {margin >= 0 ? (
              <div className="text-green-600 font-semibold">
                ✅ Товар прибыльный. Маржинальность: {margin.toFixed(2)} ₽ (
                {marginPercent.toFixed(2)}%)
              </div>
            ) : (
              <div className="text-red-600 font-semibold">
                ❌ Товар убыточный. Убыток: {Math.abs(margin).toFixed(2)} ₽
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
