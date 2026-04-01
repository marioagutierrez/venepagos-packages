/// Representa un link de pago de VenePagos.
class PaymentLink {
  final String id;
  final String merchantId;
  final double amount;
  final String currency;
  final String? description;
  final String token;
  final String url;
  final bool isActive;
  final DateTime? expiresAt;
  final DateTime createdAt;

  const PaymentLink({
    required this.id,
    required this.merchantId,
    required this.amount,
    required this.currency,
    this.description,
    required this.token,
    required this.url,
    required this.isActive,
    this.expiresAt,
    required this.createdAt,
  });

  factory PaymentLink.fromJson(Map<String, dynamic> json) {
    return PaymentLink(
      id: json['id'] as String,
      merchantId: json['merchantId'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      description: json['description'] as String?,
      token: json['token'] as String,
      url: json['url'] as String,
      isActive: json['isActive'] as bool? ?? true,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'merchantId': merchantId,
      'amount': amount,
      'currency': currency,
      if (description != null) 'description': description,
      'token': token,
      'url': url,
      'isActive': isActive,
      if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  @override
  String toString() => 'PaymentLink(id: $id, amount: $amount $currency)';
}

/// Datos para crear un link de pago.
class CreatePaymentLinkRequest {
  final String merchantId;
  final double amount;
  final String? currency;
  final String? description;
  final DateTime? expiresAt;

  const CreatePaymentLinkRequest({
    required this.merchantId,
    required this.amount,
    this.currency,
    this.description,
    this.expiresAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'merchantId': merchantId,
      'amount': amount,
      if (currency != null) 'currency': currency,
      if (description != null) 'description': description,
      if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
    };
  }
}

/// Datos para actualizar un link de pago.
class UpdatePaymentLinkRequest {
  final double? amount;
  final String? currency;
  final String? description;
  final DateTime? expiresAt;
  final bool? isActive;

  const UpdatePaymentLinkRequest({
    this.amount,
    this.currency,
    this.description,
    this.expiresAt,
    this.isActive,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (amount != null) map['amount'] = amount;
    if (currency != null) map['currency'] = currency;
    if (description != null) map['description'] = description;
    if (expiresAt != null) map['expiresAt'] = expiresAt!.toIso8601String();
    if (isActive != null) map['isActive'] = isActive;
    return map;
  }
}

/// Informacion publica de pago obtenida via token.
class PaymentInfo {
  final String id;
  final String merchantId;
  final double amount;
  final String currency;
  final String? description;
  final bool isActive;
  final DateTime? expiresAt;

  const PaymentInfo({
    required this.id,
    required this.merchantId,
    required this.amount,
    required this.currency,
    this.description,
    required this.isActive,
    this.expiresAt,
  });

  factory PaymentInfo.fromJson(Map<String, dynamic> json) {
    return PaymentInfo(
      id: json['id'] as String,
      merchantId: json['merchantId'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      description: json['description'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'merchantId': merchantId,
      'amount': amount,
      'currency': currency,
      if (description != null) 'description': description,
      'isActive': isActive,
      if (expiresAt != null) 'expiresAt': expiresAt!.toIso8601String(),
    };
  }

  @override
  String toString() => 'PaymentInfo(id: $id, amount: $amount $currency)';
}

/// Datos para crear una orden via checkout de tienda.
class CreateOrderRequest {
  final String customerName;
  final String customerEmail;
  final String? customerPhone;
  final int? quantity;
  final String? shippingAddress;
  final String? notes;

  const CreateOrderRequest({
    required this.customerName,
    required this.customerEmail,
    this.customerPhone,
    this.quantity,
    this.shippingAddress,
    this.notes,
  });

  Map<String, dynamic> toJson() {
    return {
      'customerName': customerName,
      'customerEmail': customerEmail,
      if (customerPhone != null) 'customerPhone': customerPhone,
      if (quantity != null) 'quantity': quantity,
      if (shippingAddress != null) 'shippingAddress': shippingAddress,
      if (notes != null) 'notes': notes,
    };
  }
}

/// Resultado de crear una orden.
class OrderResult {
  /// Datos de la orden creada.
  final Map<String, dynamic> order;

  /// URL de pago para completar la orden.
  final String paymentUrl;

  const OrderResult({
    required this.order,
    required this.paymentUrl,
  });

  factory OrderResult.fromJson(Map<String, dynamic> json) {
    return OrderResult(
      order: json['order'] as Map<String, dynamic>,
      paymentUrl: json['paymentUrl'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'order': order,
      'paymentUrl': paymentUrl,
    };
  }

  @override
  String toString() => 'OrderResult(paymentUrl: $paymentUrl)';
}
