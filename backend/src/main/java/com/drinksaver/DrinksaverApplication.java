package com.drinksaver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DrinksaverApplication {

	public static void main(String[] args) {
		SpringApplication.run(DrinksaverApplication.class, args);
	}

}
