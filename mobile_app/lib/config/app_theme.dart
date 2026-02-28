import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ============================================================================
/// TrafficGuard Mobile App - Design System
/// ============================================================================
/// This file contains all colors, text styles, and design constants
/// to maintain consistency across the entire app.
/// 
/// RULES:
/// 1. NEVER use emojis for icons - always use Icon() widget with Material Icons
/// 2. NEVER use hardcoded colors inline - always reference AppColors
/// 3. ALL text must use AppTextStyles or explicit TextStyle with 'Inter' fontFamily
/// 4. ALL cards must follow AppCardStyle specifications
/// 5. ALL buttons must follow AppButtonStyle specifications
/// ============================================================================

class AppColors {
  // Prevent instantiation
  AppColors._();

  // ==========================================================================
  // Primary Brand Colors (Rwanda National Police Theme)
  // ==========================================================================
  static const Color primary = Color(0xFF1A56DB);        // RNP Blue
  static const Color primaryDark = Color(0xFF1E40AF);    // Darker blue
  static const Color primaryLight = Color(0xFF3B82F6);   // Lighter blue
  
  // ==========================================================================
  // Background Colors (Dark Theme - matching dashboard)
  // ==========================================================================
  static const Color background = Color(0xFF0F172A);      // Main background (slate-900)
  static const Color backgroundSecondary = Color(0xFF131929); // Card background
  static const Color backgroundTertiary = Color(0xFF1E293B); // Elevated surfaces
  static const Color surface = Color(0xFF1E2D45);         // Surface/border color
  
  // ==========================================================================
  // Text Colors
  // ==========================================================================
  static const Color textPrimary = Color(0xFFFFFFFF);     // White - main text
  static const Color textSecondary = Color(0xFF94A3B8);   // Slate-400 - secondary text
  static const Color textTertiary = Color(0xFF64748B);    // Slate-500 - tertiary/hints
  static const Color textMuted = Color(0xFF475569);       // Slate-600 - muted text
  
  // ==========================================================================
  // Accent/Status Colors
  // ==========================================================================
  static const Color success = Color(0xFF10B981);         // Green - success states
  static const Color successLight = Color(0xFF34D399);    // Light green
  static const Color warning = Color(0xFFF59E0B);         // Amber - warnings
  static const Color warningLight = Color(0xFFFBBF24);    // Light amber
  static const Color error = Color(0xFFEF4444);           // Red - errors
  static const Color errorLight = Color(0xFFF87171);      // Light red
  static const Color info = Color(0xFF3B82F6);            // Blue - info
  
  // ==========================================================================
  // Border & Divider Colors
  // ==========================================================================
  static const Color border = Color(0xFF1E2D45);          // Card borders
  static const Color borderLight = Color(0xFF334155);     // Lighter borders
  static const Color divider = Color(0xFF1E293B);         // Dividers
  
  // ==========================================================================
  // Overlay Colors
  // ==========================================================================
  static const Color overlay = Color(0x80000000);         // 50% black overlay
  static const Color overlayLight = Color(0x40000000);    // 25% black overlay
  
  // ==========================================================================
  // Gradient Definitions
  // ==========================================================================
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, primaryDark],
  );
  
  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [background, Color(0xFF0C1322)],
  );
  
  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [backgroundSecondary, Color(0xFF0F1724)],
  );
}

/// Helper class for getting Inter font TextStyles
class AppTextStyles {
  // Prevent instantiation
  AppTextStyles._();
  
  // ==========================================================================
  // Display Styles (Large headlines)
  // ==========================================================================
  static TextStyle get displayLarge => GoogleFonts.inter(
    fontSize: 32,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
    height: 1.2,
  );
  
  static TextStyle get displayMedium => GoogleFonts.inter(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
    height: 1.2,
  );
  
  static TextStyle get displaySmall => GoogleFonts.inter(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.2,
    height: 1.3,
  );
  
  // ==========================================================================
  // Headline Styles
  // ==========================================================================
  static TextStyle get headlineLarge => GoogleFonts.inter(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    height: 1.3,
  );
  
  static TextStyle get headlineMedium => GoogleFonts.inter(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    height: 1.3,
  );
  
  static TextStyle get headlineSmall => GoogleFonts.inter(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    height: 1.4,
  );
  
  // ==========================================================================
  // Title Styles
  // ==========================================================================
  static TextStyle get titleLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    height: 1.4,
  );
  
  static TextStyle get titleMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    height: 1.4,
  );
  
  static TextStyle get titleSmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
    height: 1.4,
  );
  
  // ==========================================================================
  // Body Styles
  // ==========================================================================
  static TextStyle get bodyLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.5,
  );
  
  static TextStyle get bodyMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.5,
  );
  
  static TextStyle get bodySmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.5,
  );
  
  // ==========================================================================
  // Label Styles
  // ==========================================================================
  static TextStyle get labelLarge => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
    height: 1.4,
  );
  
  static TextStyle get labelMedium => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    height: 1.4,
  );
  
  static TextStyle get labelSmall => GoogleFonts.inter(
    fontSize: 10,
    fontWeight: FontWeight.w500,
    color: AppColors.textTertiary,
    letterSpacing: 0.8,
    height: 1.4,
  );
  
  // ==========================================================================
  // Button Text Styles
  // ==========================================================================
  static TextStyle get buttonLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
    height: 1.2,
  );
  
  static TextStyle get buttonMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
    height: 1.2,
  );
  
  static TextStyle get buttonSmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
    letterSpacing: 0.3,
    height: 1.2,
  );
}

class AppSpacing {
  // Prevent instantiation
  AppSpacing._();
  
  // ==========================================================================
  // Standard Spacing Values
  // ==========================================================================
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
  
  // ==========================================================================
  // Specific Spacing
  // ==========================================================================
  static const double cardPadding = 16.0;
  static const double screenPadding = 20.0;
  static const double betweenCards = 12.0;
  static const double betweenElements = 8.0;
  static const double sectionSpacing = 24.0;
}

class AppBorderRadius {
  // Prevent instantiation
  AppBorderRadius._();
  
  // ==========================================================================
  // Border Radius Values
  // ==========================================================================
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double full = 100.0;
  
  // ==========================================================================
  // Pre-built BorderRadius Objects
  // ==========================================================================
  static BorderRadius card = BorderRadius.circular(lg);
  static BorderRadius button = BorderRadius.circular(26.0);
  static BorderRadius input = BorderRadius.circular(md);
  static BorderRadius avatar = BorderRadius.circular(full);
  static BorderRadius chip = BorderRadius.circular(sm);
}

class AppShadows {
  // Prevent instantiation
  AppShadows._();
  
  // ==========================================================================
  // Shadow Definitions
  // ==========================================================================
  static List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.2),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),
  ];
  
  static List<BoxShadow> buttonShadow = [
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.3),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];
  
  static List<BoxShadow> elevatedShadow = [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.3),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];
}

class AppCardStyle {
  // Prevent instantiation
  AppCardStyle._();
  
  // ==========================================================================
  // Standard Card Decoration
  // ==========================================================================
  static BoxDecoration standard = BoxDecoration(
    color: AppColors.backgroundSecondary,
    borderRadius: AppBorderRadius.card,
    border: Border.all(
      color: AppColors.border,
      width: 1,
    ),
  );
  
  static BoxDecoration elevated = BoxDecoration(
    color: AppColors.backgroundSecondary,
    borderRadius: AppBorderRadius.card,
    border: Border.all(
      color: AppColors.border,
      width: 1,
    ),
    boxShadow: AppShadows.cardShadow,
  );
  
  static BoxDecoration gradient = BoxDecoration(
    gradient: AppColors.cardGradient,
    borderRadius: AppBorderRadius.card,
    border: Border.all(
      color: AppColors.border,
      width: 1,
    ),
  );
}

class AppButtonStyle {
  // Prevent instantiation
  AppButtonStyle._();
  
  // ==========================================================================
  // Primary Button Style
  // ==========================================================================
  static ButtonStyle primary = ElevatedButton.styleFrom(
    backgroundColor: AppColors.primary,
    foregroundColor: AppColors.textPrimary,
    minimumSize: const Size(double.infinity, 52),
    shape: RoundedRectangleBorder(
      borderRadius: AppBorderRadius.button,
    ),
    elevation: 0,
    textStyle: AppTextStyles.buttonLarge,
  );
  
  // ==========================================================================
  // Secondary/Outlined Button Style
  // ==========================================================================
  static ButtonStyle secondary = OutlinedButton.styleFrom(
    foregroundColor: AppColors.primary,
    minimumSize: const Size(double.infinity, 52),
    side: const BorderSide(color: AppColors.primary, width: 1.5),
    shape: RoundedRectangleBorder(
      borderRadius: AppBorderRadius.button,
    ),
    textStyle: AppTextStyles.buttonLarge,
  );
  
  // ==========================================================================
  // Text Button Style
  // ==========================================================================
  static ButtonStyle text = TextButton.styleFrom(
    foregroundColor: AppColors.primary,
    textStyle: AppTextStyles.buttonMedium,
  );
}

class AppInputStyle {
  // Prevent instantiation
  AppInputStyle._();
  
  // ==========================================================================
  // Standard Input Decoration
  // ==========================================================================
  static InputDecoration standard({
    required String hintText,
    Widget? prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: AppTextStyles.bodyMedium.copyWith(
        color: AppColors.textTertiary,
      ),
      prefixIcon: prefixIcon,
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: AppColors.backgroundTertiary,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.lg,
      ),
      border: OutlineInputBorder(
        borderRadius: AppBorderRadius.input,
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppBorderRadius.input,
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppBorderRadius.input,
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: AppBorderRadius.input,
        borderSide: const BorderSide(color: AppColors.error),
      ),
    );
  }
}

/// ==========================================================================
/// App Theme Data - For MaterialApp theme property
/// ==========================================================================
class AppTheme {
  // Prevent instantiation
  AppTheme._();
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.primaryLight,
        surface: AppColors.backgroundSecondary,
        error: AppColors.error,
        onPrimary: AppColors.textPrimary,
        onSecondary: AppColors.textPrimary,
        onSurface: AppColors.textPrimary,
        onError: AppColors.textPrimary,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: AppTextStyles.headlineMedium,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: AppButtonStyle.primary,
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: AppButtonStyle.secondary,
      ),
      textButtonTheme: TextButtonThemeData(
        style: AppButtonStyle.text,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.backgroundTertiary,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.lg,
        ),
        border: OutlineInputBorder(
          borderRadius: AppBorderRadius.input,
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppBorderRadius.input,
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppBorderRadius.input,
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.backgroundSecondary,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppBorderRadius.card,
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
      ),
      iconTheme: const IconThemeData(
        color: AppColors.textSecondary,
        size: 24,
      ),
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayLarge,
        displayMedium: AppTextStyles.displayMedium,
        displaySmall: AppTextStyles.displaySmall,
        headlineLarge: AppTextStyles.headlineLarge,
        headlineMedium: AppTextStyles.headlineMedium,
        headlineSmall: AppTextStyles.headlineSmall,
        titleLarge: AppTextStyles.titleLarge,
        titleMedium: AppTextStyles.titleMedium,
        titleSmall: AppTextStyles.titleSmall,
        bodyLarge: AppTextStyles.bodyLarge,
        bodyMedium: AppTextStyles.bodyMedium,
        bodySmall: AppTextStyles.bodySmall,
        labelLarge: AppTextStyles.labelLarge,
        labelMedium: AppTextStyles.labelMedium,
        labelSmall: AppTextStyles.labelSmall,
      ),
    );
  }
}
